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
  private _howl: Howl | null = null
  private _analyser: AnalyserNode | null = null
  private _dataBuffer = new Uint8Array(0) // 复用缓冲区，避免每帧 GC
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
    // this.initWebAudio();
    // 初始化事件监听器
    this.initializeEventSystem()
  }

  private initializeEventSystem() {
    const events: PlayerEvent[] = ['play', 'pause', 'stop', 'end', 'load', 'error', 'timeupdate', 'seek', 'volumechange', 'buffering', 'ready']

    events.forEach(event => {
      this._eventListeners.set(event, new Set())
    })
  }

  // private initWebAudio() {
  //     try {
  //         // 创建 Web Audio API 上下文
  //         this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
  //             sampleRate: 48000, // 尝试设置采样率，但浏览器可能忽略
  //             latencyHint: 'interactive',
  //         });

  //         // 创建分析器用于可视化
  //         // this.analyser = this.audioContext.createAnalyser();
  //         // this.analyser.fftSize = 2048;

  //         console.log('Web Audio API 初始化成功，采样率:', this.audioContext.sampleRate);
  //     } catch (error) {
  //         console.error('Web Audio API 初始化失败:', error);
  //     }
  // }

  // 播放歌曲
  public async play(song: ISong, startTime: number = 0) {
    // 停止当前播放
    this.stop()

    this._currentSong = song

    // 获取音频流 URL
    const streamUrl = await window.electronAPI.getAudioStreamUrl(song.filePath)
    console.log('播放音频流:', streamUrl)
    if (this._currentSong?.uid !== song.uid) return

    this._howl = new Howl({
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
  }

  // 事件系统方法
  private dispatchEvent(event: PlayerEvent, detail?: PlayerEventDetail) {
    const listeners = this._eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(detail)
        } catch (error) {
          console.error(`Error in ${event} event listener:`, error)
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

  private connectToWebAudio() {
    if (!this._howl) return
    // 获取 howler 内部的音源节点（这是一个稳定访问方式）
    const sound = (this._howl as any)._sounds[0]
    if (!sound || !sound._node) return
    // 获取 Web Audio Context
    const ctx = Howler.ctx
    // 创建分析器节点
    this._analyser = ctx.createAnalyser()
    this._analyser.fftSize = 512
    // this._analyser.smoothingTimeConstant = 0.3
    const sourceNode = sound._node

    // 将音源连接到分析器节点，再连接到输出
    sourceNode.connect(this._analyser)
    this._analyser.connect(ctx.destination)
    this._dataBuffer = new Uint8Array(this._analyser.frequencyBinCount)
  }

  /** 获取可视化数据 */
  getVisualizationData(): { frequency: Uint8Array; waveform?: Uint8Array } | null {
    if (!this._analyser) {
      // return { frequency: new Uint8Array(0), waveform: new Uint8Array(0) }
      return null
    }

    // const bufferLength = this._analyser.frequencyBinCount
    // const frequencyData = new Uint8Array(bufferLength)
    // const waveformData = new Uint8Array(bufferLength)

    // 获取频率（或频域）数据
    this._analyser.getByteFrequencyData(this._dataBuffer)
    // 获取波形（或时域）数据
    // this._analyser.getByteTimeDomainData(waveformData)

    return {
      frequency: this._dataBuffer,
      // waveform: waveformData
    }
  }

  // 连接到 Web Audio API
  // private connectToWebAudio() {
  //     if (!this.currentHowl || !this.audioContext || !this.analyser) return;

  //     try {
  //         // 获取 Howler 的音频元素
  //         const sound = (this.currentHowl as any)._sounds[0];
  //         if (!sound || !sound._node) return;

  //         const audioElement = sound._node;

  //         // 创建媒体源节点
  //         this.source = this.audioContext.createMediaElementSource(audioElement);

  //         // 创建增益节点
  //         const gainNode = this.audioContext.createGain();
  //         gainNode.gain.value = this.volume;

  //         // 连接音频处理链
  //         this.source.connect(gainNode);
  //         gainNode.connect(this.analyser);
  //         this.analyser.connect(this.audioContext.destination);

  //         console.log('已连接到 Web Audio API');
  //     } catch (error) {
  //         console.error('连接到 Web Audio API 失败:', error);
  //     }
  // }

  // 获取可视化数据
  // getVisualizationData(): { frequency: Uint8Array; waveform: Uint8Array } {
  //     if (!this.analyser) {
  //         return { frequency: new Uint8Array(0), waveform: new Uint8Array(0) };
  //     }

  //     const bufferLength = this.analyser.frequencyBinCount;
  //     const frequencyData = new Uint8Array(bufferLength);
  //     const waveformData = new Uint8Array(bufferLength);

  //     this.analyser.getByteFrequencyData(frequencyData);
  //     this.analyser.getByteTimeDomainData(waveformData);

  //     return { frequency: frequencyData, waveform: waveformData };
  // }

  // 应用音频效果
  // applyAudioEffect(effect: 'reverb' | 'echo' | 'flanger' | 'distortion') {
  //     if (!this.audioContext || !this.source) return;

  //     switch (effect) {
  //         case 'reverb':
  //             this.applyReverb();
  //             break;
  //         case 'echo':
  //             this.applyEcho();
  //             break;
  //         case 'flanger':
  //             this.applyFlanger();
  //             break;
  //         case 'distortion':
  //             this.applyDistortion();
  //             break;
  //     }
  // }

  // private applyReverb() {
  //     if (!this.audioContext || !this.source) return;

  //     const convolver = this.audioContext.createConvolver();

  //     // 创建脉冲响应（模拟房间混响）
  //     const sampleRate = this.audioContext.sampleRate;
  //     const length = sampleRate * 3; // 3秒混响
  //     const impulse = this.audioContext.createBuffer(2, length, sampleRate);

  //     for (let channel = 0; channel < 2; channel++) {
  //         const channelData = impulse.getChannelData(channel);
  //         for (let i = 0; i < length; i++) {
  //             channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
  //         }
  //     }

  //     convolver.buffer = impulse;

  //     // 重新连接音频链
  //     this.source.disconnect();
  //     this.source.connect(convolver);
  //     convolver.connect(this.analyser!);
  // }

  // 其他效果实现类似...

  // getFormat(filePath: string): string {
  //     const ext = filePath.toLowerCase().split('.').pop();
  //     const formatMap: Record<string, string> = {
  //         'mp3': 'mp3',
  //         'wav': 'wav',
  //         'flac': 'flac',
  //         'ogg': 'ogg',
  //         'm4a': 'm4a',
  //         'aac': 'aac',
  //         'opus': 'opus',
  //     };
  //     return formatMap[ext!] || '';
  // }

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

  stop() {
    if (this._howl) {
      this._howl.stop()
      this._howl.unload()
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

  destroy() {
    this.stop()

    // if (this.audioContext && this.audioContext.state !== 'closed') {
    //     this.audioContext.close();
    // }
    this._eventListeners.forEach(listeners => {
      listeners.clear()
    })
  }
}
