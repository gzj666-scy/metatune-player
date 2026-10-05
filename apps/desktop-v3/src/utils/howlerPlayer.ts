import { DefaultVolume, type ISong } from '@metatune/common-v3'
import { Howl, Howler } from 'howler'
import { AudioVisualizer, type VisualizationBands } from './audioVisualizer'

// 自定义事件类型
export type PlayerEvent =
  | 'play'
  | 'pause'
  | 'stop'
  | 'end'
  | 'load'
  | 'error'
  | 'timeupdate'
  | 'seek'
  | 'volumechange'
  | 'buffering'
  | 'ready'

export interface PlayerEventDetail {
  time?: number
  error?: any
  volume?: number
  song?: ISong
  duration?: number
}

/** 可视化音频链路（旁路采集，不影响播放） */
interface Visualization {
  ctx: AudioContext
  source: GainNode
  splitter: ChannelSplitterNode
  leftAnalyser: AnalyserNode
  rightAnalyser: AnalyserNode
}

export class HowlerPlayer {
  private _previousHowl: Howl | null = null // 保留上一个实例引用，延迟卸载，避免切歌爆音
  private _unloadTimer: number | undefined = undefined // 延迟卸载定时器
  private _howl: Howl | null = null
  private _vis: Visualization | null = null
  // 频谱数据处理器（音频链建好即创建，数据加工逻辑全在其内）
  private _visualizer: AudioVisualizer | null = null

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
  /** 响度归一化是否启用（由设置开关同步；关闭时不套用任何补偿增益） */
  public loudnessEnabled = false
  /** 当前歌曲的 LUFS 补偿增益(线性值)：dB → 线性；缺省 0dB → 1.0(不改变音量) */
  private get gainLinear(): number {
    if (!this.loudnessEnabled) return 1
    return Math.pow(10, (this._currentSong?.gain ?? 0) / 20)
  }
  /**
   * 应用到 Howl 的有效音量：用户音量(0-1) × 补偿增益(线性)，上限钳 1.0。
   * Web Audio 模式下音量经 GainNode（理论上可 >1 做 boost），钳顶既能避免
   * boost 时超出 0dBFS 产生削波，又兼容"响度大的歌照常衰减"。
   */
  private effectiveVolume(): number {
    return Math.min(1, (this._volume / 100) * this.gainLinear)
  }
  private _currentSong: ISong | null = null
  public get currentSong() {
    return this._currentSong
  }

  constructor() {
    Howler.autoSuspend = false // 防止 Chromium 闲置时挂起音频上下文（对齐最初版）
    this.initializeEventSystem()
  }

  private initializeEventSystem() {
    const events: PlayerEvent[] = [
      'play',
      'pause',
      'stop',
      'end',
      'load',
      'error',
      'timeupdate',
      'seek',
      'volumechange',
      'buffering',
      'ready',
    ]
    events.forEach(event => {
      this._eventListeners.set(event, new Set())
    })
  }

  private getFormatFromFilePath(filePath: string): string {
    const ext = filePath.split('.').pop() || ''
    return ext.toLowerCase()
  }

  // 播放歌曲
  public async play(song: ISong, startTime = 0) {
    // 先停止当前播放（内部会处理旧实例移交）
    this.stop()
    this._currentSong = song

    // 获取音频流 URL
    const streamUrl = await window.electronAPI.getAudioStreamUrl(song.filePath)
    if (this._currentSong?.uid !== song.uid) return
    console.log('播放音频流:', streamUrl)

    const howl = new Howl({
      src: [streamUrl],
      // 恢复最初版设计：Web Audio 管线（规避 html5 模式的 CSP / 自动播放策略报错）
      html5: false,
      // 流地址无后缀（.../stream?p=...），必须显式给 format。否则 Howler 在 load() 阶段
      // 按 URL 末段取到 'stream' 选不到 codec，直接 _emit('loaderror') 返回、根本不发请求
      format: [this.getFormatFromFilePath(song.filePath)],
      preload: 'metadata',
      volume: 0,
      mute: this._isMuted,
    })

    // load 事件在网络返回后异步触发，构造后立即绑定不会错过
    this.bindHowlEvents(howl, song, startTime)
    this._howl = howl
  }

  private bindHowlEvents(howl: Howl, song: ISong, startTime: number) {
    howl.once('load', () => {
      if (this._currentSong?.uid !== song.uid || this._howl !== howl) return
      this.dispatchEvent('load', { song })

      if (startTime > 0) howl.seek(startTime)

      this._howl?.fade(0, this.effectiveVolume(), this._fadeDuration)
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
      this._howl?.fade(0, this.effectiveVolume(), this._fadeDuration)
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
   * 建立可视化：直接接入 Howler 内部音源节点（Web Audio 模式 sound._node 是 GainNode），
   * 经 ChannelSplitter 分离左右声道 → 左右 AnalyserNode。不介入播放主链路（仅旁路监听），音质不受影响。
   * 对齐最初版（apps/desktop）已验证的实现；失败时返回 null（频谱静默）。
   */
  private ensureVisualization(): Visualization | null {
    if (this._vis) return this._vis
    if (!this._howl) return null
    const sound = (this._howl as any)._sounds?.[0]
    const sourceNode = sound?._node as GainNode | undefined
    if (!sourceNode) return null

    const ctx = Howler.ctx as AudioContext
    try {
      // 断开 Howler 内部 GainNode 到 destination 的原始连接，避免双重信号路径，会直接污染音频输出，并可能引发底层音频调度异常。
      // 防御性断开 sound._node 到 destination 的直连（多数版本不直连，无害；对齐最初版）
      try {
        sourceNode.disconnect(ctx.destination)
      } catch {
        /* 首次连接时可能没有 */
      }

      const splitter = ctx.createChannelSplitter(2)
      sourceNode.connect(splitter)
      const leftAnalyser = ctx.createAnalyser()
      const rightAnalyser = ctx.createAnalyser()
      // fftSize 降到 2048：每 bin 能量更高、更跟手，且 FFT 开销减半。
      // smoothingTimeConstant 只做轻量去噪：真正的律动手感交给 AudioVisualizer 的 attack/release 包络，
      // 避免 AnalyserNode 自身再平滑一道把鼓点瞬态吃掉（旧版 0.6 + 包络 = 双重平滑，所以「太平静」）。
      leftAnalyser.fftSize = 2048
      rightAnalyser.fftSize = 2048
      leftAnalyser.smoothingTimeConstant = 0.5
      rightAnalyser.smoothingTimeConstant = 0.5
      splitter.connect(leftAnalyser, 0)
      splitter.connect(rightAnalyser, 1)

      this._vis = { ctx, source: sourceNode, splitter, leftAnalyser, rightAnalyser }
      // 音频链建好即创建频谱数据处理器（滤波器组/缓冲/包络状态都在其内初始化）
      this._visualizer = new AudioVisualizer(leftAnalyser, rightAnalyser)
      return this._vis
    } catch (error) {
      console.warn('可视化链路建立失败:', error)
      return null
    }
  }

  /** 销毁可视化：断开分析器并恢复音源到 destination（对齐最初版 disconnectAnalyser，避免实例卸载残留） */
  private teardownVisualization() {
    if (!this._vis) return
    try {
      this._vis.splitter.disconnect()
      this._vis.leftAnalyser.disconnect()
      this._vis.rightAnalyser.disconnect()
      // 恢复音源直连 destination（多数版本已通过 howl._node → masterGain 输出，此处再连无害）
      try {
        this._vis.source.connect(this._vis.ctx.destination)
      } catch {
        /* 已连接则忽略 */
      }
    } catch (e) {
      // 链路可能已部分销毁，忽略清理异常
    }
    this._vis = null
    this._visualizer = null
  }

  /** 获取可视化数据：委托给 AudioVisualizer 处理，返回 { bands, peaks } 各 128(左 64 + 右 64)，未就绪返回 null */
  getVisualizationDataBands(): VisualizationBands | null {
    const vis = this.ensureVisualization()
    if (!vis || !this._visualizer) return null
    // AudioContext 闲置可能被自动挂起
    if (vis.ctx.state === 'suspended') vis.ctx.resume().catch(() => {})
    return this._visualizer.getBands()
  }

  // 时间追踪
  private startTimeTracking() {
    this.stopTimeTracking()
    this._intervalId = window.setInterval(() => {
      if (this._howl && this._isPlaying && !this._isSeeking) {
        const time = this._howl.seek() as number,
          duration = this._howl.duration() as number
        this.dispatchEvent('timeupdate', { time, duration })
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
      this._howl?.fade(this.effectiveVolume(), 0, this._fadeDuration)
      this._fadeTimeoutId = window.setTimeout(() => {
        this._howl?.pause()
      }, this._fadeDuration)
    }
  }

  resume() {
    if (this._howl && !this._isPlaying && this._currentSong) {
      this._howl?.fade(0, this.effectiveVolume(), this._fadeDuration)
      this._howl.play()
    }
  }

  seek(time: number) {
    if (this._howl) {
      this._isSeeking = true
      clearTimeout(this._fadeTimeoutId)
      this._howl?.fade(this.effectiveVolume(), 0, this._fadeDuration)
      this._fadeTimeoutId = window.setTimeout(() => {
        this._howl?.seek(time)
      }, this._fadeDuration)
    }
  }

  setVolume(volume: number) {
    this._volume = volume
    if (this._howl) {
      this._howl.volume(this.effectiveVolume())
    }
    this.dispatchEvent('volumechange', { volume })
  }

  /**
   * 测量完成后套用 LUFS 补偿增益：重新计算有效音量并平滑过渡。
   * 不重新解码、不改动态、零音质损失；仅在当前正在播放该歌曲时生效。
   */
  public applyLoudness() {
    if (!this._howl || !this._currentSong) return
    const target = this.effectiveVolume()
    this._howl.fade(this._howl.volume(), target, 250)
    this.dispatchEvent('volumechange', { volume: this._volume })
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
