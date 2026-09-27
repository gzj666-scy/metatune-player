import { DefaultVolume, type ISong } from '@metatune/common-v3'
import { Howl, Howler } from 'howler'

// v3 音质策略：html5: true（HTMLAudioElement 原生媒体管线）。
// 原版 html5: false 走 WebAudio，采样率被强制重采样到 44.1/48kHz、Float32 混音，
// 高码率无损音质受损；html5 模式由系统媒体栈直接渲染，保留原始采样率/位深。
// 代价：音频不经过 WebAudio 图，频谱可视化改用 captureStream 旁路取流（见 ensureVisualization）。

// 自定义事件类型
export type PlayerEvent = 'play' | 'pause' | 'stop' | 'end' | 'load' | 'error' | 'timeupdate' | 'seek' | 'volumechange' | 'buffering' | 'ready'

export interface PlayerEventDetail {
  time?: number
  error?: any
  volume?: number
  song?: ISong
}

/** 可视化音频链路（旁路采集，不影响播放） */
interface Visualization {
  ctx: AudioContext
  source: MediaStreamAudioSourceNode
  splitter: ChannelSplitterNode
  leftAnalyser: AnalyserNode
  rightAnalyser: AnalyserNode
}

export class HowlerPlayer {
  private _previousHowl: Howl | null = null // 保留上一个实例引用，延迟卸载，避免切歌爆音
  private _unloadTimer: number | undefined = undefined // 延迟卸载定时器
  private _howl: Howl | null = null
  private _vis: Visualization | null = null

  // 左右声道分析状态
  private _filterBank: Float32Array[] | null = null
  private _dataBufferLeft = new Float32Array(0)
  private _dataBufferRight = new Float32Array(0)
  private _smoothLeft = new Float32Array(64)
  private _smoothRight = new Float32Array(64)
  private _peakLeft = new Float32Array(64)
  private _peakRight = new Float32Array(64)
  private _finalDataBuffer = new Float32Array(128)
  private _melBandsLeft = new Float32Array(64)
  private _melBandsRight = new Float32Array(64)
  private _linearLeft = new Float32Array(0)
  private _linearRight = new Float32Array(0)

  private _isSeeking = false
  private _intervalId: number | undefined = undefined
  private _fadeTimeoutId: number | undefined = undefined
  private _fadeDuration = 1000
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
    this.initializeEventSystem()
    // howler 构造时即开始加载，crossOrigin 必须在池化 Audio 元素出池时统一设置
    // （可视化 captureStream 要求媒体经过 CORS 净化，否则采集到的是静音流）
    this.patchHtml5AudioCrossOrigin()
  }

  private initializeEventSystem() {
    const events: PlayerEvent[] = ['play', 'pause', 'stop', 'end', 'load', 'error', 'timeupdate', 'seek', 'volumechange', 'buffering', 'ready']
    events.forEach(event => {
      this._eventListeners.set(event, new Set())
    })
  }

  private patchHtml5AudioCrossOrigin() {
    const howlerAny = Howler as any
    if (typeof howlerAny._obtainHtml5Audio !== 'function' || howlerAny.__crossOriginPatched) return
    const obtain = howlerAny._obtainHtml5Audio.bind(Howler)
    howlerAny._obtainHtml5Audio = () => {
      const audio: HTMLAudioElement = obtain()
      audio.crossOrigin = 'anonymous'
      return audio
    }
    howlerAny.__crossOriginPatched = true
  }

  // 播放歌曲
  public async play(song: ISong, startTime = 0) {
    // 先停止当前播放（内部会处理旧实例移交）
    this.stop()
    this._currentSong = song

    // 获取音频流 URL
    const streamUrl = await window.electronAPI.getAudioStreamUrl(song.filePath)
    console.log('播放音频流:', streamUrl)
    if (this._currentSong?.uid !== song.uid) return

    const howl = new Howl({
      src: [streamUrl],
      // v3：原生 html5 音频管线，最大化音质；扩展名提示不可省（流地址无后缀）
      html5: true,
      format: [this.getFormatFromFilePath(song.filePath)],
      preload: 'metadata',
      volume: 0,
      mute: this._isMuted,
    })

    // load 事件在网络返回后异步触发，构造后立即绑定不会错过
    this.bindHowlEvents(howl, song, startTime)
    this._howl = howl
  }

  private getFormatFromFilePath(filePath: string): string {
    const ext = filePath.split('.').pop() || ''
    return ext.toLowerCase()
  }

  private bindHowlEvents(howl: Howl, song: ISong, startTime: number) {
    howl.once('load', () => {
      if (this._currentSong?.uid !== song.uid || this._howl !== howl) return
      this.dispatchEvent('load', { song })

      if (startTime > 0) howl.seek(startTime)

      this._howl?.fade(0, this._volume / 100, this._fadeDuration)
      this._howl?.play()
      this.dispatchEvent('ready', { song })
    })

    howl.on('play', () => {
      console.log('onplay ', song.fileName)
      // 在歌曲开始播放后，安排卸载上一个实例
      this.scheduleUnloadPrevious()
      this._isPlaying = true
      this._isSeeking = false
      this.startTimeTracking()
      this.dispatchEvent('play', { song })
    })

    howl.on('pause', () => {
      console.log('onpause ', song.fileName)
      this._isPlaying = false
      this.stopTimeTracking()
      this.dispatchEvent('pause', { song })
    })

    howl.on('stop', () => {
      console.log('onstop ', song.fileName)
      this._isPlaying = false
      this.stopTimeTracking()
      this.dispatchEvent('stop', { song })
    })

    howl.on('end', () => {
      console.log('onend ', song.fileName)
      this._isPlaying = false
      this._isSeeking = false
      this.stopTimeTracking()
      if (this._currentSong?.uid !== song.uid) return
      this.dispatchEvent('end', { song })
    })

    howl.on('seek', () => {
      console.log('onseek ', song.fileName)
      this._isSeeking = false
      if (this._currentSong?.uid !== song.uid) return
      this._howl?.fade(0, this._volume / 100, this._fadeDuration)
      this.dispatchEvent('seek', { time: this._howl?.seek() as number })
    })

    howl.on('loaderror', (_id, error) => {
      console.error(song.fileName, ' 音频加载失败: ', error)
      if (this._currentSong?.uid !== song.uid) return
      this.dispatchEvent('error', { error })
    })

    howl.on('playerror', (_id, error) => {
      console.error(song.fileName, ' 音频播放失败: ', error)
      if (this._currentSong?.uid !== song.uid) return
      this.dispatchEvent('error', { error })
    })
  }

  // 事件系统方法
  private dispatchEvent(event: PlayerEvent, detail?: PlayerEventDetail) {
    const listeners = this._eventListeners.get(event)
    if (listeners) {
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
    this._eventListeners.get(event)?.add(callback)
  }

  public off(event: PlayerEvent, callback: (detail?: PlayerEventDetail) => void) {
    this._eventListeners.get(event)?.delete(callback)
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
      } catch (e) {
        // 卸载失败可忽略（实例可能已销毁）
      }
      this._previousHowl = null
    }
  }

  /**
   * 建立可视化旁路：captureStream 采集 <audio> 输出，经 MediaStreamSource → 分离左右声道 → 分析器。
   * 不介入播放链路，音质不受影响；失败时返回 null（频谱静默）。
   */
  private ensureVisualization(): Visualization | null {
    if (this._vis) return this._vis
    if (!this._howl) return null
    const node = (this._howl as any)._sounds?.[0]?._node as HTMLAudioElement | undefined
    if (!node || typeof (node as any).captureStream !== 'function') return null

    try {
      const stream: MediaStream = (node as any).captureStream()
      if (!stream || stream.getAudioTracks().length === 0) return null

      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const splitter = ctx.createChannelSplitter(2)
      const leftAnalyser = ctx.createAnalyser()
      const rightAnalyser = ctx.createAnalyser()
      leftAnalyser.fftSize = 4096
      rightAnalyser.fftSize = 4096
      leftAnalyser.smoothingTimeConstant = 0.6
      rightAnalyser.smoothingTimeConstant = 0.6
      source.connect(splitter)
      splitter.connect(leftAnalyser, 0)
      splitter.connect(rightAnalyser, 1)

      this._dataBufferLeft = new Float32Array(leftAnalyser.frequencyBinCount)
      this._dataBufferRight = new Float32Array(rightAnalyser.frequencyBinCount)
      this._linearLeft = new Float32Array(leftAnalyser.frequencyBinCount)
      this._linearRight = new Float32Array(rightAnalyser.frequencyBinCount)
      // 创建 Mel 滤波器组（用 2048 个线性 bin）
      this._filterBank = this.createMelFilterBank(2048, ctx.sampleRate, 64)

      this._vis = { ctx, source, splitter, leftAnalyser, rightAnalyser }
      return this._vis
    } catch (error) {
      console.warn('可视化链路建立失败:', error)
      return null
    }
  }

  /** 销毁可视化旁路 */
  private teardownVisualization() {
    if (!this._vis) return
    try {
      this._vis.source.disconnect()
      this._vis.splitter.disconnect()
      this._vis.leftAnalyser.disconnect()
      this._vis.rightAnalyser.disconnect()
      this._vis.ctx.close()
    } catch (e) {
      // 链路可能已部分销毁，忽略清理异常
    }
    this._vis = null
    this._filterBank = null
  }

  // 定义 Mel 滤波器组 (将 2048 个线性 bin 映射到 64 个 Mel 频带)
  private createMelFilterBank(numBins: number, sampleRate: number, numMelBands = 64) {
    const lowFreq = 20 // 最低频率
    const highFreq = sampleRate / 2 // Nyquist
    // 梅尔刻度是模仿人耳对频率感知的非线性刻度。公式是：mel = 2595 * Math.log10(1 + freq / 700)
    const lowMel = 2595 * Math.log10(1 + lowFreq / 700)
    const highMel = 2595 * Math.log10(1 + highFreq / 700)
    const melPoints: number[] = []
    for (let i = 0; i <= numMelBands + 1; i++) {
      const mel = lowMel + (highMel - lowMel) * (i / (numMelBands + 1))
      const freq = 700 * (Math.pow(10, mel / 2595) - 1)
      const bin = Math.round((freq / sampleRate) * numBins)
      melPoints.push(bin)
    }

    // 构建滤波器组
    const filterBank: Float32Array[] = []
    for (let i = 0; i < numMelBands; i++) {
      const start = melPoints[i]
      const center = melPoints[i + 1]
      const end = melPoints[i + 2]
      const weights = new Float32Array(numBins)
      for (let j = start; j < center; j++) {
        weights[j] = (j - start) / (center - start)
      }
      for (let j = center; j < end; j++) {
        weights[j] = (end - j) / (end - center)
      }
      filterBank.push(weights)
    }
    return filterBank
  }

  // 提取 Mel 能量（复用缓冲区，v3 修复原版每帧分配新 Float32Array 的问题）
  private getMelEnergy(analyser: AnalyserNode, bufferData: Float32Array<ArrayBuffer>, linearOut: Float32Array, bandsOut: Float32Array): Float32Array {
    analyser.getFloatFrequencyData(bufferData)

    // 将 dB 转换为线性幅度 (0~1)
    for (let i = 0; i < bufferData.length; i++) {
      linearOut[i] = Math.pow(10, bufferData[i] / 20)
    }

    // 应用 Mel 滤波器组得到 64 个频带
    for (let i = 0; i < 64; i++) {
      let sum = 0
      const weights = this._filterBank![i]
      for (let j = 0; j < weights.length; j++) {
        sum += linearOut[j] * weights[j]
      }
      bandsOut[i] = sum
    }
    return bandsOut
  }

  // 瞬态提取：按变化幅度返回（纯慢衰减版本）
  private extractTransient(melBands: Float32Array, smoothState: Float32Array, peakState: Float32Array, result: Float32Array): Float32Array {
    // 瞬态提取的核心参数
    const smoothFactor = 0.92 // 能量基准更新速度，越大基准变化越慢
    const decay = 0.6 // 慢衰减系数，越大掉得越慢
    const noiseFloor = 0.01 // 背景噪声阈值，削掉微弱变化
    const sensitivity = 3.0 // 输出强度缩放，越大冲击越猛

    // 1. 计算当前帧全局最大值（用于动态钳制）
    let maxVal = 0.001
    for (let i = 0; i < 64; i++) {
      if (melBands[i] > maxVal) maxVal = melBands[i]
    }
    if (maxVal < 0.001) maxVal = 0.001

    // 2. 逐个频带处理
    for (let i = 0; i < 64; i++) {
      const current = melBands[i] / maxVal // 归一化到 0~1

      // 计算"变化幅度"：当前值 - 上一帧平滑值
      let diff = current - smoothState[i]

      // 更新平滑状态
      smoothState[i] = smoothState[i] * smoothFactor + current * (1 - smoothFactor)

      // 只保留正向变化，应用阈值后放大，钳制到 0~1
      diff = Math.max(0, diff) - noiseFloor
      if (diff < 0) diff = 0
      diff = Math.min(1, diff * sensitivity)

      // 慢衰减峰值保持
      if (diff > peakState[i]) {
        peakState[i] = diff
      } else {
        peakState[i] = peakState[i] * decay
      }

      result[i] = peakState[i]
    }

    return result
  }

  /** 获取可视化数据（128 = 左声道 64 + 右声道 64），未开启/失败返回 null */
  getVisualizationDataBands(): Float32Array | null {
    const vis = this.ensureVisualization()
    if (!vis) return null

    // AudioContext 闲置可能被自动挂起
    if (vis.ctx.state === 'suspended') vis.ctx.resume().catch(() => {})

    const melLeft = this.getMelEnergy(vis.leftAnalyser, this._dataBufferLeft, this._linearLeft, this._melBandsLeft)
    const melRight = this.getMelEnergy(vis.rightAnalyser, this._dataBufferRight, this._linearRight, this._melBandsRight)

    this.extractTransient(melLeft, this._smoothLeft, this._peakLeft, this._melBandsLeft)
    this.extractTransient(melRight, this._smoothRight, this._peakRight, this._melBandsRight)

    for (let i = 0; i < 64; i++) {
      this._finalDataBuffer[i] = Math.min(1, this._melBandsLeft[i] * 0.5)
      this._finalDataBuffer[64 + i] = Math.min(1, this._melBandsRight[i] * 0.5)
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
      this._howl?.fade(this._volume / 100, 0, this._fadeDuration)
      this._fadeTimeoutId = window.setTimeout(() => {
        this._howl?.pause()
      }, this._fadeDuration)
    }
  }

  resume() {
    if (this._howl && !this._isPlaying && this._currentSong) {
      this._howl?.fade(0, this._volume / 100, this._fadeDuration)
      this._howl.play()
    }
  }

  seek(time: number) {
    if (this._howl) {
      this._isSeeking = true
      clearTimeout(this._fadeTimeoutId)
      this._howl?.fade(this._volume / 100, 0, this._fadeDuration)
      this._fadeTimeoutId = window.setTimeout(() => {
        this._howl?.seek(time)
      }, this._fadeDuration)
    }
  }

  setVolume(volume: number) {
    this._volume = volume
    if (this._howl) {
      this._howl.volume(this._volume / 100)
    }
    this.dispatchEvent('volumechange', { volume })
  }

  toggleMute(muted: boolean) {
    this._isMuted = muted
    if (this._howl) {
      this._howl.mute(this._isMuted)
    }
  }

  stop() {
    if (this._howl) {
      this.clearPreviousHowl() // 若已有"上一首"实例，直接卸载掉（只保留最近一个）
      this._howl.stop()
      this._howl.off()
      // 将当前实例交给 previous，而不是立即 unload
      this._previousHowl = this._howl
      this._howl = null
    }
    this.teardownVisualization()
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
