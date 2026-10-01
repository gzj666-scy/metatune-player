export interface LoudnessResult {
  /** 实测集成响度 LUFS */
  lufs: number
  /** 实测 true peak dBTP */
  truePeak: number
  /** 补偿增益 dB（已按 target / ceiling 计算，可直接写入 song.gain） */
  gain: number
}

interface PendingItem {
  resolve: (r: LoudnessResult) => void
  reject: (e: Error) => void
}

interface WorkerRes {
  id: number
  ok: boolean
  lufs?: number
  truePeak?: number
  gain?: number
  error?: string
}

/**
 * 渲染进程响度测量服务。
 * 因为 Electron 的 Worker 全局未暴露 AudioContext / OfflineAudioContext，
 * 解码（decodeAudioData）必须在主线程完成，Worker 只负责轻量的 BS.1770 纯数学测量。
 * 单例：跨歌曲共享一个 Worker，按 filePath 防重入。
 */
class LoudnessService {
  private worker: Worker | null = null
  private seq = 0
  private pending = new Map<number, PendingItem>()
  private measuring = new Set<string>()
  /** 主线程解码用的 AudioContext（懒创建、复用，避免超过浏览器实例上限） */
  private decodeCtx: AudioContext | null = null

  private ensureWorker() {
    if (this.worker) return
    this.worker = new Worker(new URL('../workers/loudness.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (e: MessageEvent) => {
      const data = e.data as WorkerRes
      const item = this.pending.get(data.id)
      if (!item) return
      this.pending.delete(data.id)
      if (data.ok && data.lufs !== undefined && data.truePeak !== undefined && data.gain !== undefined) {
        item.resolve({ lufs: data.lufs, truePeak: data.truePeak, gain: data.gain })
      } else {
        item.reject(new Error(data.error || 'lufs measure failed'))
      }
    }
    this.worker.onerror = e => {
      console.error('Loudness worker error:', e.message)
    }
  }

  private getDecodeCtx(): AudioContext {
    if (!this.decodeCtx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.decodeCtx = new Ctor()
    }
    return this.decodeCtx
  }

  /** 把任意声道数折成最多 2 声道(L/R)的独立副本，保证可安全 transfer 给 Worker */
  private toStereo(audio: AudioBuffer): Float32Array[] {
    const n = audio.numberOfChannels
    const len = audio.length
    if (n <= 1) {
      const c = audio.getChannelData(0).slice()
      return [c, c] // 单声道复制两份，避免 transfer 同一 buffer 两次
    }
    if (n === 2) {
      return [audio.getChannelData(0).slice(), audio.getChannelData(1).slice()]
    }
    const left = new Float32Array(len)
    const right = new Float32Array(len)
    for (let c = 0; c < n; c++) {
      const data = audio.getChannelData(c)
      const target = c % 2 === 0 ? left : right
      for (let i = 0; i < len; i++) target[i] += data[i]
    }
    return [left, right]
  }

  /** 测量一首歌并算出补偿增益；同一文件正在测量则抛错（由调用方静默跳过） */
  async measure(filePath: string, targetLoudness: number, truePeakCeiling: number): Promise<LoudnessResult> {
    if (this.measuring.has(filePath)) {
      throw new Error('measuring in progress: ' + filePath)
    }
    this.measuring.add(filePath)
    try {
      this.ensureWorker()
      // 1) 主线程读文件字节
      const raw = await window.electronAPI.readAudioBuffer(filePath)
      if (!raw) throw new Error('read audio buffer failed: ' + filePath)
      // 2) 主线程解码（Web Audio 解码只能在渲染主线程）
      //    显式拷进独立 ArrayBuffer，满足 decodeAudioData 的类型要求并规避 Uint8Array 的 byteOffset 隐患
      const ab = new ArrayBuffer(raw.byteLength)
      new Uint8Array(ab).set(raw)
      const audio = await this.getDecodeCtx().decodeAudioData(ab)
      // 3) 折成双声道并拷贝（transfer 会 detached 副本，不影响原 AudioBuffer）
      const channels = this.toStereo(audio)
      // 4) 把 PCM 交给 Worker 做纯数学测量
      const id = ++this.seq
      const result = await new Promise<LoudnessResult>((resolve, reject) => {
        this.pending.set(id, { resolve, reject })
        this.worker!.postMessage(
          { id, channels, sampleRate: audio.sampleRate, targetLoudness, truePeakCeiling },
          channels.map(c => c.buffer)
        )
      })
      return result
    } finally {
      this.measuring.delete(filePath)
    }
  }
}

export const loudnessService = new LoudnessService()
