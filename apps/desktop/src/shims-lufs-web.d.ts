// lufs-web 0.1.1 未自带类型声明，这里补一个最小 ambient 声明。
// 仅覆盖本项目用到的 API（BS.1770-4 集成响度 + true peak 测量）。
declare module 'lufs-web' {
  export interface LufsMeasureResult {
    integratedLUFS: number
    lra: number
    truePeakDB: number
    truePeakLin: number
    monoLUFS: number
    monoDelta: number
  }

  export interface LufsMeasureInput {
    sampleRate: number
    channels: Float32Array[]
  }

  export function measure(input: LufsMeasureInput): LufsMeasureResult
  export function measureIntegratedLUFS(input: LufsMeasureInput): number
  export function measureLRA(input: LufsMeasureInput): number
  export function measureTruePeak(channels: { channels: Float32Array[] }): { truePeakDB: number; truePeakLin: number }
}
