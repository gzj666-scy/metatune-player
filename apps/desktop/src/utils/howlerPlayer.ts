import { DefaultVolume, type ISong } from '@metatune/common'
import { Howl } from 'howler'

// Web Audio API 网页环境依赖浏览器音频API（如Web Audio API），其采样率被强制限制在44.1kHz/16bit，且无法绕过系统混音器
// 浏览器环境有以下几个音质限制：
// 音频重采样：浏览器会统一重采样到固定频率（通常是 44.1kHz 或 48kHz）
// 自动增益控制：浏览器会自动调整音量，可能导致动态范围压缩
// 混音干扰：浏览器标签页间的音频会混合，可能引入噪声
// 格式限制：对高分辨率音频（如 24-bit/192kHz）支持有限
// 位深限制：JavaScript 使用 Float32 处理音频，有精度损失

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

  private _dataBufferUint8 = new Uint8Array(0) // 复用缓冲区，避免每帧 GC
  private _dataBufferFloat32 = new Float32Array(0) // 复用缓冲区，避免每帧 GC

  // 左右声道分析用
  private _splitter: ChannelSplitterNode | null = null
  private _leftAnalyser: AnalyserNode | null = null
  private _rightAnalyser: AnalyserNode | null = null
  private _filterBank: Float32Array[] | null = null
  private _dataBufferLeft = new Float32Array(0)
  private _dataBufferRight = new Float32Array(0)
  private _smoothLeft = new Float32Array(64)
  private _smoothRight = new Float32Array(64)
  private _peakLeft = new Float32Array(64)
  private _peakRight = new Float32Array(64)
  private _finalDataBuffer = new Float32Array(128)

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
    Howler.autoSuspend = false // 防止 Chromium 闲置时挂起音频上下文
    this.initializeEventSystem()
  }

  private initializeEventSystem() {
    const events: PlayerEvent[] = ['play', 'pause', 'stop', 'end', 'load', 'error', 'timeupdate', 'seek', 'volumechange', 'buffering', 'ready']

    events.forEach(event => {
      this._eventListeners.set(event, new Set())
    })
  }

  // 播放歌曲
  public async play(song: ISong, startTime: number = 0) {
    // 先停止当前播放（内部会处理旧实例移交）
    this.stop()

    this._currentSong = song

    // 获取音频流 URL
    const streamUrl = await window.electronAPI.getAudioStreamUrl(song.filePath)
    console.log('播放音频流:', streamUrl)
    if (this._currentSong?.uid !== song.uid) return

    const howl = new Howl({
      src: [streamUrl],
      html5: false,
      // format: this.getFormatFromFilePath(song.filePath),
      // autoplay: false,
      // preload: true,
      preload: 'metadata',
      // volume: this._volume / 100,
      volume: 0,
      mute: this._isMuted,

      onload: () => {
        if (this._currentSong?.uid !== song.uid) return
        this.dispatchEvent('load', { song })

        if (startTime > 0 && this._howl) {
          this._howl.seek(startTime)
        }

        this.connectToWebAudio()

        this._howl?.fade(0, this._volume / 100, this._fadeDuration)
        this._howl?.play()
        this.dispatchEvent('ready', { song })
      },

      onplay: () => {
        console.log('onplay ', song.fileName)
        // 在歌曲开始播放后，安排卸载上一个实例
        this.scheduleUnloadPrevious()
        this._isPlaying = true
        this._isSeeking = false
        this.startTimeTracking()
        this.dispatchEvent('play', { song })
      },

      onpause: () => {
        console.log('onpause ', song.fileName)
        this._isPlaying = false
        this.stopTimeTracking()
        this.dispatchEvent('pause', { song })
      },

      onstop: () => {
        console.log('onstop ', song.fileName)
        this._isPlaying = false
        this.stopTimeTracking()
        this.dispatchEvent('stop', { song })
      },

      onend: () => {
        console.log('onend ', song.fileName)
        this._isPlaying = false
        this._isSeeking = false
        this.stopTimeTracking()
        if (this._currentSong?.uid !== song.uid) return
        this.dispatchEvent('end', { song })
      },

      onseek: () => {
        console.log('onseek ', song.fileName)
        this._isSeeking = false
        if (this._currentSong?.uid !== song.uid) return
        this._howl?.fade(0, this._volume / 100, this._fadeDuration)
        this.dispatchEvent('seek', {
          time: this._howl?.seek() as number,
        })
      },

      onloaderror: (id, error) => {
        console.error(song.fileName, ' 音频加载失败: ', error)
        if (this._currentSong?.uid !== song.uid) return
        this.dispatchEvent('error', { error })
      },

      onplayerror: (id, error) => {
        console.error(song.fileName, ' 音频播放失败: ', error)
        if (this._currentSong?.uid !== song.uid) return
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
      } catch (e) {}
      this._previousHowl = null
    }
  }

  private connectToWebAudio() {
    if (!this._howl) return
    // 获取 howler 内部的音源节点（这是一个稳定访问方式）
    const sound = (this._howl as any)._sounds[0]
    if (!sound || !sound._node) return
    // 获取 Web Audio Context
    const ctx = Howler.ctx
    const sourceNode = sound._node as GainNode
    //  断开 Howler 内部 GainNode 到 destination 的原始连接，避免双重信号路径，会直接污染音频输出，并可能引发底层音频调度异常。
    try {
      sourceNode.disconnect(ctx.destination)
    } catch (e) {
      /* 首次连接时可能没有 */
    }

    /*************************** 频率数据模式 ***************************/
    // 创建分析器节点
    // this._analyser = ctx.createAnalyser()
    // this._analyser.fftSize = 512
    // this._analyser.smoothingTimeConstant = 0.6
    // // 将音源连接到分析器节点，再连接到输出
    // sourceNode.connect(this._analyser)
    // this._analyser.connect(ctx.destination)
    // this._dataBufferUint8 = new Uint8Array(this._analyser.frequencyBinCount)
    // this._dataBufferFloat32 = new Float32Array(this._analyser.frequencyBinCount)
    // return

    /*************************** 声道音量模式 ***************************/
    // 分离左右声道
    this._splitter = ctx.createChannelSplitter(2)
    sourceNode.connect(this._splitter)
    // 左右声道分析节点
    this._leftAnalyser = ctx.createAnalyser()
    this._rightAnalyser = ctx.createAnalyser()
    this._leftAnalyser.fftSize = 4096
    this._rightAnalyser.fftSize = 4096
    // this._leftAnalyser.fftSize = 128
    // this._rightAnalyser.fftSize = 128
    this._leftAnalyser.smoothingTimeConstant = 0.6 // 不平滑，跳跃效果
    this._rightAnalyser.smoothingTimeConstant = 0.6
    this._splitter.connect(this._leftAnalyser, 0)
    this._splitter.connect(this._rightAnalyser, 1)

    this._dataBufferLeft = new Float32Array(this._leftAnalyser.frequencyBinCount)
    this._dataBufferRight = new Float32Array(this._rightAnalyser.frequencyBinCount)
    // 创建 Mel 滤波器组（用 2048 个线性 bin）
    this._filterBank = this.createMelFilterBank(2048, ctx.sampleRate, 64)
  }

  // 定义 Mel 滤波器组 (将 2048 个线性 bin 映射到 64 个 Mel 频带)
  private createMelFilterBank(numBins: number, sampleRate: number, numMelBands = 64) {
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

    // 构建滤波器组
    const filterBank = []
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

  // 提取 Mel 能量 (将 FFT 转换为 64 个 Mel 频带的能量，返回 0~1 浮点数组)
  private getMelEnergy(analyser: AnalyserNode, bufferData: Float32Array<ArrayBuffer>): Float32Array {
    analyser.getFloatFrequencyData(bufferData)

    // 将 dB 转换为线性幅度 (0~1)
    const linear = new Float32Array(bufferData.length)
    for (let i = 0; i < bufferData.length; i++) {
      linear[i] = Math.pow(10, bufferData[i] / 20)
    }

    // 应用 Mel 滤波器组得到 64 个频带
    const melBands = new Float32Array(64)
    for (let i = 0; i < 64; i++) {
      let sum = 0
      const weights = this._filterBank![i] // 你之前生成的滤波器组
      for (let j = 0; j < weights.length; j++) {
        sum += linear[j] * weights[j]
      }
      melBands[i] = sum
    }

    // 返回原始的 Mel 能量（不做归一化，保留 0~1 左右范围）
    return melBands
  }

  // 瞬态提取：按变化幅度返回
  private extractTransient(melBands: Float32Array, smoothState: Float32Array, peakState: Float32Array): Float32Array {
    const result = new Float32Array(64)
    // 瞬态提取的核心参数
    const smoothFactor = 0.92 // 能量基准更新速度（0~1），越大基准变化越慢
    const decay = 0.6 // ★ 慢衰减系数（0~1），越大掉得越慢，0.99会拖尾很长
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

      // ③ 混合：直接输出峰值状态（也可以混合原始瞬态）
      // 这里可以直接返回 peakState[i]，形成纯粹的慢衰减条
      // 如果想保留一些瞬态的锐利感，可以混合：
      // const mix = 0.7; // 峰值占比
      // result[i] = peakState[i] * mix + diff * (1 - mix);
      result[i] = peakState[i] // 纯慢衰减版本，条形更长更柔和
    }

    return result
  }

  /** 获取可视化数据 */
  getVisualizationData(): Uint8Array | null {
    if (!this._analyser) {
      // return { frequency: new Uint8Array(0), waveform: new Uint8Array(0) }
      return null
    }

    // const bufferLength = this._analyser.frequencyBinCount
    // const frequencyData = new Uint8Array(bufferLength)
    // const waveformData = new Uint8Array(bufferLength)

    // 获取频域数据（FFT/频谱，字节值 0-255）
    this._analyser.getByteFrequencyData(this._dataBufferUint8)
    return this._dataBufferUint8
    // 获取频域数据（FFT/频谱，浮点分贝值）范围通常是 ‌-200 dB 到 0 dB‌，其中 0 dB 是最大可能值（满量程），负值代表衰减，最小达-Infinity
    // this._analyser.getFloatFrequencyData(this._dataBufferFloat32)
    // return this._dataBufferFloat32

    // 获取波形（或时域）数据，0 到 255 (128是0轴)
    // this._analyser.getByteTimeDomainData(this._dataBufferUint8)
    // return this._dataBufferUint8
    // 获取波形（或时域）数据，范围为-1.0到1.0
    // this._analyser.getFloatTimeDomainData(this._dataBufferFloat32)
    // return this._dataBufferFloat32
  }

  getVisualizationDataBands(): Float32Array | null {
    if (!this._leftAnalyser || !this._rightAnalyser) {
      return null
    }

    const melLeft = this.getMelEnergy(this._leftAnalyser, this._dataBufferLeft)
    const melRight = this.getMelEnergy(this._rightAnalyser, this._dataBufferRight)

    const processedLeft = this.extractTransient(melLeft, this._smoothLeft, this._peakLeft)
    const processedRight = this.extractTransient(melRight, this._smoothRight, this._peakRight)

    for (let i = 0; i < 64; i++) {
      this._finalDataBuffer[i] = Math.min(1, processedLeft[i] * 0.5)
      this._finalDataBuffer[64 + i] = Math.min(1, processedRight[i] * 0.5)
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
    this.dispatchEvent('volumechange', { volume: volume })
  }

  toggleMute(muted: boolean) {
    this._isMuted = muted
    if (this._howl) {
      this._howl.mute(this._isMuted)
    }
  }

  // 安全断开 Analyser 并恢复原始连接，否则 unload 可能出错或留残留连接
  private disconnectAnalyser() {
    const sound = (this._howl as any)?._sounds?.[0]
    const gainNode = sound?._node as GainNode
    if (gainNode && this._analyser) {
      try {
        gainNode.disconnect(this._analyser)
        this._analyser.disconnect()
        // 重新将 gainNode 连回 destination，保持 howler 原始状态
        gainNode.connect(Howler.ctx.destination)
      } catch (e) {}
    }
  }

  stop() {
    if (this._howl) {
      this.disconnectAnalyser()
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
