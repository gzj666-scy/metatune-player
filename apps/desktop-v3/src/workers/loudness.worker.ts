import { measure } from 'lufs-web'

interface ReqMsg {
  id: number
  /** 已折成最多 2 声道（L/R）的 PCM，来自主线程解码结果 */
  channels: Float32Array[]
  /** 文件原生采样率（解码得到的 audio.sampleRate） */
  sampleRate: number
  targetLoudness: number
  truePeakCeiling: number
}

interface ResMsg {
  id: number
  ok: boolean
  lufs?: number
  truePeak?: number
  gain?: number
  error?: string
}

// Worker 全局作用域（DOM lib 下 self 被推断为 Window，这里用最小接口收窄类型）
interface WorkerScope {
  onmessage: ((e: MessageEvent) => void) | null
  postMessage(message: unknown, transfer?: Transferable[]): void
}

const scope = self as unknown as WorkerScope

// Worker 内只做 BS.1770 纯数学测量，不依赖任何 Web Audio API（Electron 的 Worker 全局未暴露 AudioContext/OfflineAudioContext）
scope.onmessage = (e: MessageEvent<ReqMsg>) => {
  const { id, channels, sampleRate, targetLoudness, truePeakCeiling } = e.data
  try {
    const r = measure({ sampleRate, channels })
    const lufs = r.integratedLUFS
    const truePeak = r.truePeakDB
    // 防削波优先：取「响度补偿」与「true-peak 上限」的较小值
    const gain = Math.min(targetLoudness - lufs, truePeakCeiling - truePeak)
    const msg: ResMsg = { id, ok: true, lufs, truePeak, gain }
    scope.postMessage(msg)
  } catch (err) {
    const msg: ResMsg = { id, ok: false, error: err instanceof Error ? err.message : String(err) }
    scope.postMessage(msg)
  }
}
