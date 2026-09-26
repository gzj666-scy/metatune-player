import { DefaultVolume, type ISong } from '@metatune/common-v2'
import { Howl } from 'howler'

// Web Audio API 网页环境依赖浏览器音频API（如Web Audio API），其采样率被强制限制在44.1kHz/16bit，且无法绕过系统混音器
// 浏览器环境有以下几个音质限制：
// 音频重采样：浏览器会统一重采样到固定频率（通常是 44.1kHz 或 48kHz）
// 自动增益控制：浏览器会自动调整音量，可能导致动态范围压缩
// 混音干扰：浏览器标签页间的音频会混合，可能引入噪声
// 格式限制：对高分辨率音频（如 24-bit/192kHz）支持有限
// 位深限制：JavaScript 使用 Float32 处理音频，有精度损失

/** 可视化的 Mel 频带数（左右各一份，共 128 根）
 * 注意：它与 WAVEFORM_BANDS 的取值必须和 PlayerView 的渲染逻辑一致 */
const MEL_BANDS = 64

/** 切换歌曲时的淡入时长：只为消除起播爆音，不做可听衰减，避免吃掉开头一秒 */
const FADE_IN = 60
/** 暂停/快进/切歌的淡出时长：够消爆音，又要让操作立即生效 */
const FADE_OUT = 120

/** 单个 Mel 滤波带。只保留非零区间，取能量时不必遍历整段频谱 */
interface MelBand {
  start: number
  weights: Float32Array
}

// 自定义事件类型
export type PlayerEvent = 'play' | 'pause' | 'stop' | 'end' | 'load' | 'error' | 'timeupdate' | 'seek' | 'volumechange' | 'buffering' | 'ready'

export interface PlayerEventDetail {
  time?: number
  error?: any
  volume?: number
  song?: ISong
}

export class HowlerPlayer {
  private _previousHowl: Howl | null = null // 保留上一个实例引用，延迟卸载，将 GC 发生在稳定播放后。
  private _unloadTimer: number | undefined = undefined // 延迟卸载定时器
  private _howl: Howl | null = null
  private _analyser: AnalyserNode | null = null

  /** 播放代次：切歌时自增，用于作废尚未完成的异步加载结果 */
  private _playToken = 0

  private _dataBufferUint8 = new Uint8Array(0) // 复用缓冲区，避免每帧 GC

  // 左右声道分析用
  private _splitter: ChannelSplitterNode | null = null
  private _leftAnalyser: AnalyserNode | null = null
  private _rightAnalyser: AnalyserNode | null = null
  private _filterBank: MelBand[] | null = null
  /** 滤波器组所属的 AudioContext，用于识别上下文是否被重建 */
  private _analysisCtx: AudioContext | null = null
  private _dataBufferLeft = new Float32Array(0)
  private _dataBufferRight = new Float32Array(0)
  /** dB -> 线性幅度的复用缓冲区 */
  private _linearBuffer = new Float32Array(0)
  private _melLeft = new Float32Array(MEL_BANDS)
  private _melRight = new Float32Array(MEL_BANDS)
  private _outLeft = new Float32Array(MEL_BANDS)
  private _outRight = new Float32Array(MEL_BANDS)
  private _smoothLeft = new Float32Array(MEL_BANDS)
  private _smoothRight = new Float32Array(MEL_BANDS)
  private _peakLeft = new Float32Array(MEL_BANDS)
  private _peakRight = new Float32Array(MEL_BANDS)
  private _finalDataBuffer = new Float32Array(MEL_BANDS * 2)

  private _isSeeking = false
  private _intervalId: number | undefined = undefined
  private _fadeTimeoutId: number | undefined = undefined
  private _isMuted = false
  // 事件系统
  private _eventListeners: Map<PlayerEvent, Set<(detail?: PlayerEventDetail) => void>> = new Map()
  // 播放状态
  private _isPlaying = false
  public get isPlaying() {
    return this._isPlaying
  }
  private _volume = DefaultVolume
  public get volume() {
    return this._volume
  }
  private _currentSong: ISong | null = null
  public get currentSong() {
    return this._currentSong
  }

  constructor() {
    Howler.autoSuspend = false // 防止 Chromium 闲置时挂起音频上下文
    this.initializeEventSystem()
  }

  private initializeEventSystem() {
    const events: PlayerEvent[] = ['play', 'pause', 'stop', 'end', 'load', 'error', 'timeupdate', 'seek', 'volumechange', 'buffering', 'ready']

    events.forEach(event => {
      this._eventListeners.set(event, new Set())
    })
  }

  /** 从文件扩展名推断解码格式：流地址是 media://stream/<token>，没有扩展名可供 Howler 推断 */
  private getFormatFromFilePath(filePath: string): string | undefined {
    const match = /\.([a-z0-9]+)$/i.exec(filePath)
    return match?.[1]?.toLowerCase()
  }

  // 播放歌曲
  public async play(song: ISong, startTime: number = 0) {
    // 先停止当前播放（内部会处理旧实例移交）
    this.stop()

    const token = ++this._playToken
    this._currentSong = song

    // 获取音频流地址：主进程签发的一次性 token，只对曲库内文件有效
    const streamUrl = await window.electronAPI.openAudioStream(song.uid)
    // 加载期间又切了歌，本次作废，避免两首歌同时出声
    if (token !== this._playToken) return
    if (!streamUrl) {
      this.dispatchEvent('error', { error: '无法播放：歌曲不在曲库中或文件已被移动' })
      return
    }

    const howl = new Howl({
      src: [streamUrl],
      html5: false,
      format: this.getFormatFromFilePath(song.filePath),
      preload: 'metadata',
      volume: 0,
      mute: this._isMuted,

      onload: () => {
        if (token !== this._playToken) return
        this.dispatchEvent('load', { song })

        if (startTime > 0 && this._howl) {
          this._howl.seek(startTime)
        }

        this.connectToWebAudio()

        // 极短淡入只为消除起播爆音，不做可听衰减 —— 否则每首歌开头一秒都会被压暗
        this._howl?.fade(0, this._volume / 100, FADE_IN)
        this._howl?.play()
        this.dispatchEvent('ready', { song })
      },

      onplay: () => {
        if (token !== this._playToken) return
        // 在歌曲开始播放后，安排卸载上一个实例
        this.scheduleUnloadPrevious()
        this._isPlaying = true
        this._isSeeking = false
        this.startTimeTracking()
        this.dispatchEvent('play', { song })
      },

      onpause: () => {
        if (token !== this._playToken) return
        this._isPlaying = false
        this.stopTimeTracking()
        this.dispatchEvent('pause', { song })
      },

      onstop: () => {
        if (token !== this._playToken) return
        this._isPlaying = false
        this.stopTimeTracking()
        this.dispatchEvent('stop', { song })
      },

      onend: () => {
        if (token !== this._playToken) return
        this._isPlaying = false
        this._isSeeking = false
        this.stopTimeTracking()
        this.dispatchEvent('end', { song })
      },

      onseek: () => {
        if (token !== this._playToken) return
        this._isSeeking = false
        this._howl?.fade(0, this._volume / 100, FADE_IN)
        this.dispatchEvent('seek', {
          time: this._howl?.seek() as number,
        })
      },

      onloaderror: (_id, error) => {
        if (token !== this._playToken) return
        console.error(song.fileName, ' 音频加载失败: ', error)
        this.dispatchEvent('error', { error })
      },

      onplayerror: (_id, error) => {
        if (token !== this._playToken) return
        console.error(song.fileName, ' 音频播放失败: ', error)
        this.dispatchEvent('error', { error })
      },
    })
    this._howl = howl
  }

  // 事件系统方法
  private dispatchEvent(event: PlayerEvent, detail?: PlayerEventDetail) {
    const listeners = this._eventListeners.get(event)
    if (listeners) {
      // listeners.forEach(listener => {
      //   try {
      //     listener(detail)
      //   } catch (error) {
      //     console.error(`Error in ${event} event listener:`, error)
      //   }
      // })

      // 用 queueMicrotask 将监听器执行推迟到当前宏任务后，避免阻塞音频线程，同时保持事件顺序
      queueMicrotask(() => {
        for (const listener of listeners) {
          try {
            listener(detail)
          } catch (error) {
            console.error(`Error in ${event} event listener:`, error)
          }
        }
      })
    }
  }

  public on(event: PlayerEvent, callback: (detail?: PlayerEventDetail) => void) {
    const listeners = this._eventListeners.get(event)
    if (listeners) {
      listeners.add(callback)
    }
  }

  public off(event: PlayerEvent, callback: (detail?: PlayerEventDetail) => void) {
    const listeners = this._eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  public once(event: PlayerEvent, callback: (detail?: PlayerEventDetail) => void) {
    const onceCallback = (detail?: PlayerEventDetail) => {
      callback(detail)
      this.off(event, onceCallback)
    }
    this.on(event, onceCallback)
  }

  // 在歌曲开始播放后调用，延迟卸载旧实例
  private scheduleUnloadPrevious() {
    if (this._unloadTimer) clearTimeout(this._unloadTimer)
    this._unloadTimer = window.setTimeout(() => {
      this.clearPreviousHowl()
    }, 1000) // 1秒后执行，完全避开播放启动的关键路径
  }

  // 主动清理上一个实例
  private clearPreviousHowl() {
    if (this._unloadTimer) {
      clearTimeout(this._unloadTimer)
      this._unloadTimer = undefined
    }
    if (this._previousHowl) {
      try {
        this._previousHowl.unload()
      } catch {
        // 实例可能已被 Howler 内部回收，卸载失败不影响后续播放
      }
      this._previousHowl = null
    }
  }

  /**
   * 建立（或复用）分析链路，并让当前音源接入。
   *
   * Howler 的节点图是 `sound._node(GainNode) -> masterGain -> destination`，
   * 这里只从 `sound._node` 拉一路旁路到分析器，不动主输出链路 —— 主链路一旦断开就没有声音。
   * splitter / analyser / 滤波器组与 AudioContext 同生命周期，只在首次或上下文重建时创建一次。
   */
  private connectToWebAudio() {
    if (!this._howl) return
    const sound = (this._howl as any)._sounds[0]
    if (!sound || !sound._node) return

    const { ctx } = Howler
    const sourceNode = sound._node as GainNode

    // Howler.unload() 会重建 AudioContext，旧的节点随之失效，这里跟着重建
    if (this._analysisCtx && this._analysisCtx !== ctx) this.resetAnalysisChain()
    if (!this._splitter) this.buildAnalysisChain(ctx)

    try {
      sourceNode.connect(this._splitter!)
    } catch {
      /* 已连接过则忽略 */
    }
  }

  /** 丢弃整条分析链路（AudioContext 失效后必须重建） */
  private resetAnalysisChain() {
    try {
      this._splitter?.disconnect()
    } catch {
      /* 已断开则忽略 */
    }
    this._splitter = null
    this._leftAnalyser = null
    this._rightAnalyser = null
    this._filterBank = null
    this._analysisCtx = null
  }

  /** 创建分析链路：左右声道各一个分析器，外加一份与采样率匹配的 Mel 滤波器组 */
  private buildAnalysisChain(ctx: AudioContext) {
    const splitter = ctx.createChannelSplitter(2)
    const left = ctx.createAnalyser()
    const right = ctx.createAnalyser()
    left.fftSize = 4096
    right.fftSize = 4096
    left.smoothingTimeConstant = 0.6
    right.smoothingTimeConstant = 0.6
    splitter.connect(left, 0)
    splitter.connect(right, 1)

    const bins = left.frequencyBinCount
    this._splitter = splitter
    this._leftAnalyser = left
    this._rightAnalyser = right
    this._dataBufferLeft = new Float32Array(bins)
    this._dataBufferRight = new Float32Array(bins)
    this._linearBuffer = new Float32Array(bins)
    // 滤波器组只取决于采样率，建一次就能一直复用（原先每切一首歌都重建，每次白分配 512KB）
    this._filterBank = this.createMelFilterBank(bins, ctx.sampleRate, MEL_BANDS)
    this._analysisCtx = ctx
  }

  /** 断开当前音源的分析旁路，保留节点本身供下一首复用 */
  private disconnectSource() {
    const sound = (this._howl as any)?._sounds?.[0]
    const gainNode = sound?._node as GainNode | undefined
    if (!gainNode || !this._splitter) return
    try {
      gainNode.disconnect(this._splitter)
    } catch {
      /* 未连接则忽略 */
    }
  }

  // 定义 Mel 滤波器组 (将线性 bin 映射到 Mel 频带)
  private createMelFilterBank(numBins: number, sampleRate: number, numMelBands = MEL_BANDS): MelBand[] {
    const lowFreq = 20 // 最低频率
    const highFreq = sampleRate / 2 // Nyquist
    // 梅尔刻度是模仿人耳对频率感知的非线性刻度。公式是：mel = 2595 * Math.log10(1 + freq / 700)
    const lowMel = 2595 * Math.log10(1 + lowFreq / 700)
    const highMel = 2595 * Math.log10(1 + highFreq / 700)
    const melPoints = []
    for (let i = 0; i <= numMelBands + 1; i++) {
      const mel = lowMel + (highMel - lowMel) * (i / (numMelBands + 1))
      const freq = 700 * (Math.pow(10, mel / 2595) - 1)
      const bin = Math.round((freq / sampleRate) * numBins)
      melPoints.push(bin)
    }

    // 构建滤波器组：只保留每个频带的非零区间，取值时无需遍历整段频谱
    const filterBank: MelBand[] = []
    for (let i = 0; i < numMelBands; i++) {
      const start = melPoints[i]
      const center = melPoints[i + 1]
      const end = melPoints[i + 2]
      const weights = new Float32Array(Math.max(end - start, 0))
      for (let j = start; j < center; j++) {
        weights[j - start] = (j - start) / (center - start)
      }
      for (let j = center; j < end; j++) {
        weights[j - start] = (end - j) / (end - center)
      }
      filterBank.push({ start, weights })
    }
    return filterBank
  }

  // 提取 Mel 能量 (将 FFT 转换为 Mel 频带的能量，写入 out)
  private getMelEnergy(analyser: AnalyserNode, bufferData: Float32Array<ArrayBuffer>, out: Float32Array): Float32Array {
    analyser.getFloatFrequencyData(bufferData)

    const filters = this._filterBank
    if (!filters) return out

    // 将 dB 转换为线性幅度 —— 复用缓冲区，避免每帧产生垃圾
    const linear = this._linearBuffer
    const length = Math.min(bufferData.length, linear.length)
    for (let i = 0; i < length; i++) {
      linear[i] = Math.pow(10, bufferData[i] / 20)
    }

    for (let i = 0; i < out.length; i++) {
      const { start, weights } = filters[i]
      let sum = 0
      for (let j = 0; j < weights.length; j++) {
        sum += linear[start + j] * weights[j]
      }
      out[i] = sum
    }

    return out
  }

  // 瞬态提取：按变化幅度写入 out
  private extractTransient(melBands: Float32Array, smoothState: Float32Array, peakState: Float32Array, out: Float32Array): Float32Array {
    // 瞬态提取的核心参数
    const smoothFactor = 0.92 // 能量基准更新速度（0~1），越大基准变化越慢
    const decay = 0.6 // ★ 慢衰减系数（0~1），越大掉得越慢，0.99会拖尾很长
    const noiseFloor = 0.01 // 背景噪声阈值，削掉微弱变化
    const sensitivity = 3.0 // 输出强度缩放，越大冲击越猛

    // 1. 计算当前帧全局最大值（用于动态钳制）
    let maxVal = 0.001
    for (let i = 0; i < melBands.length; i++) {
      if (melBands[i] > maxVal) maxVal = melBands[i]
    }
    if (maxVal < 0.001) maxVal = 0.001

    // 2. 逐个频带处理
    for (let i = 0; i < melBands.length; i++) {
      const current = melBands[i] / maxVal // 归一化到 0~1

      // 计算“变化幅度”：当前值 - 上一帧平滑值
      let diff = current - smoothState[i]

      // 更新平滑状态
      smoothState[i] = smoothState[i] * smoothFactor + current * (1 - smoothFactor)

      // 只保留正向变化
      diff = Math.max(0, diff)

      // 应用阈值：削掉小变化
      diff = diff - noiseFloor
      if (diff < 0) diff = 0

      // 放大变化幅度
      diff = diff * sensitivity

      // 钳制输出到 0~1
      diff = Math.min(1, diff)

      // ② ★ 慢衰减峰值保持 ★
      // 如果瞬态值 > 当前峰值，则立刻提升；否则缓慢衰减
      if (diff > peakState[i]) {
        peakState[i] = diff
      } else {
        peakState[i] = peakState[i] * decay // 缓慢衰减
      }

      // ③ 输出峰值状态，形成纯粹的慢衰减条
      out[i] = peakState[i]
    }

    return out
  }

  /** 获取可视化数据 */
  getVisualizationData(): Uint8Array | null {
    if (!this._analyser) {
      return null
    }
    // 获取频域数据（FFT/频谱，字节值 0-255）
    this._analyser.getByteFrequencyData(this._dataBufferUint8)
    return this._dataBufferUint8
  }

  getVisualizationDataBands(): Float32Array | null {
    if (!this._leftAnalyser || !this._rightAnalyser || !this._filterBank) {
      return null
    }

    const melLeft = this.getMelEnergy(this._leftAnalyser, this._dataBufferLeft, this._melLeft)
    const melRight = this.getMelEnergy(this._rightAnalyser, this._dataBufferRight, this._melRight)

    const processedLeft = this.extractTransient(melLeft, this._smoothLeft, this._peakLeft, this._outLeft)
    const processedRight = this.extractTransient(melRight, this._smoothRight, this._peakRight, this._outRight)

    for (let i = 0; i < MEL_BANDS; i++) {
      this._finalDataBuffer[i] = Math.min(1, processedLeft[i] * 0.5)
      this._finalDataBuffer[MEL_BANDS + i] = Math.min(1, processedRight[i] * 0.5)
    }

    return this._finalDataBuffer
  }

  // 时间追踪
  private startTimeTracking() {
    this.stopTimeTracking()
    this._intervalId = window.setInterval(() => {
      if (this._howl && this._isPlaying && !this._isSeeking) {
        const time = this._howl.seek() as number
        this.dispatchEvent('timeupdate', { time })
      }
    }, 200)
  }

  private stopTimeTracking() {
    if (this._intervalId) {
      clearInterval(this._intervalId)
      this._intervalId = undefined
    }
    clearTimeout(this._fadeTimeoutId)
  }

  // 控制方法
  pause() {
    if (this._howl && this._isPlaying) {
      clearTimeout(this._fadeTimeoutId)
      this._howl?.fade(this._volume / 100, 0, FADE_OUT)
      this._fadeTimeoutId = window.setTimeout(() => {
        this._howl?.pause()
      }, FADE_OUT)
    }
  }

  resume() {
    if (this._howl && !this._isPlaying && this._currentSong) {
      this._howl?.fade(0, this._volume / 100, FADE_IN)
      this._howl.play()
    }
  }

  seek(time: number) {
    if (this._howl) {
      this._isSeeking = true
      clearTimeout(this._fadeTimeoutId)
      this._howl?.fade(this._volume / 100, 0, FADE_OUT)
      this._fadeTimeoutId = window.setTimeout(() => {
        this._howl?.seek(time)
      }, FADE_OUT)
    }
  }

  setVolume(volume: number) {
    this._volume = volume
    if (this._howl) {
      this._howl.volume(this._volume / 100)
    }
    this.dispatchEvent('volumechange', { volume: volume })
  }

  toggleMute(muted: boolean) {
    this._isMuted = muted
    if (this._howl) {
      this._howl.mute(this._isMuted)
    }
  }

  stop() {
    if (this._howl) {
      this.disconnectSource()
      this.clearPreviousHowl() // 若已有“上一首”实例，直接卸载掉（只保留最近一个）
      this._howl.stop()
      this._howl.off()
      // 将当前实例交给 previous，而不是立即 unload
      this._previousHowl = this._howl
      this._howl = null
    }
    if (this._analyser) {
      this._analyser.disconnect()
      this._analyser = null
    }
    this.stopTimeTracking()
    this._isPlaying = false
    this._isSeeking = false
  }

  reset() {
    this._isMuted = false
    this._volume = DefaultVolume
    this._currentSong = null
  }

  destroy() {
    this.stop() // 停止当前播放
    this.clearPreviousHowl() // 立即清理
    this._eventListeners.forEach(listeners => {
      listeners.clear()
    })
  }
}
