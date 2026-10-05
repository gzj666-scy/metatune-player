/**
 * 音频频谱数据处理器（从 HowlerPlayer 抽离的纯算法模块）。
 *
 * 职责边界：本模块只接收「已建好的左右声道 AnalyserNode」，负责把原始 FFT 数据
 * 加工成最终用于展示的 0~1 幅度数组；**不负责**音频节点的连接/断开（那是 HowlerPlayer 的事）。
 *
 * 数据处理链路（参考 Wallpaper Engine / 网易云 / MDN 的成熟做法，针对「太平静」做了增强）：
 *   原始 FFT(分贝) → dB→0~1 映射 → Mel 对数频带(加权均值)
 *   → 低频低架衰减 + 高频强 1/f 校正(把高频拉到与中低频可比) + 整体增益 + 软饱和(tanh 防削顶)
 *   → 时间包络(快攻慢放) + 感知提亮 + 峰值保持(浮动帽) → 输出
 *
 * 关键设计（为什么这样调）：
 *   1. AnalyserNode 内置 smoothing 只是轻量去噪（0.5），真正的「律动手感」全部交给本模块的
 *      attack/release 包络控制 —— 避免双重平滑把鼓点瞬态吃掉。
 *   2. （低频低架 + 高频强 1/f 校正）音乐能量随频率升高天然衰减(1/f)，中高频本就 -55~-70dB。
 *      要让它们「看得见、会动」，必须①把 dB 底(VIS_MIN_DB)下探到 -70 让中高频进入可见区间
 *      （否则低于 -60 直接归零、高频整段死寂）；②对高频做强增益(VIS_HIGH_GAIN≈5) 抵消 1/f 滚降。
 *      同时低频用低架(~0.6)压住防顶满；增益曲线用 >1 指数(VIS_TILT_CURVE) 集中在高频端，中频不过热。
 *   3. 节奏「跳跃感」来自包络对鼓点瞬态的快攻(attack 0.82)快放(release 0.2)：瞬态冲顶、稳态快速
 *      回落，条子呈「弹起→掉下→再弹起」的律动，而非贴顶不动。
 */

// —— 可调参数（想调「更炸/更绵/高频更突出」改这几个常量即可） ——
// 关键修正（本轮）：上一轮「高频微抬 1.3 + dB 底 -60」对中高频无效——高频本就 -55~-70dB，
// 低于 -60 直接归零 → 高频整段死寂；1.3 倍也压不住 1/f 滚降。现把 dB 底下探到 -70 让中高频进可见区间，
// 并对高频做强 1/f 校正(VIS_HIGH_GAIN≈5)，同时 VIS_MAX_DB 调到 -26、VIS_GAMMA 0.78 让竖条上限更贴近 1。
// 低频仍用低架(VIS_LOW_GAIN 0.6)压住防顶满，增益曲线用 >1 指数集中在高频端、中频不过热。
const VIS_MIN_DB = -70 // 静音底：低于此视为 0（下探到 -70，让中高频(本就 -55~-70dB)进入可见区间，否则高频整段死寂）
const VIS_MAX_DB = -26 // 峰值阈值：达到此视为满格（44dB 窗口；整体更易顶到高位、竖条上限更贴近 1）
const VIS_BOOST = 1.2 // 整体增益
const VIS_LOW_GAIN = 0.6 // 低频衰减：低架削减，压住低频、给它跳动余量（削弱最强）
const VIS_HIGH_GAIN = 5.0 // 高频增益：强 1/f 校正，把高频(天然比中低频低 30dB+)拉到可比、明显律动
const VIS_TILT_CURVE = 1.3 // 低架→高频过渡形状（>1 让增益更集中在高频端，中频不过热）
const VIS_ATTACK = 0.82 // 包络上升系数（更大=鼓点更瞬起、跳跃更明显）
const VIS_RELEASE = 0.2 // 包络下落系数（更大=回落更快，有「掉下去再弹起」的节奏感）
const VIS_PEAK_GRAVITY = 0.9 // 峰值帽下落重力（每帧乘子，越接近 1 落得越慢）
const VIS_GAMMA = 0.78 // 感知提亮（<1 抬升整体、竖条更贴近 1）
const NUM_MEL_BANDS = 64 // 每声道 Mel 频带数

/** 最终输出给绘制层的数据：左右声道各 64 带，拼成 128 长度 */
export interface VisualizationBands {
  /** 128 帧（左 64 + 右 64）最终展示幅度，0~1 */
  bands: Float32Array
  /** 128 帧（左 64 + 右 64）峰值帽幅度，0~1 */
  peaks: Float32Array
}

export class AudioVisualizer {
  // Mel 滤波器组与权重和（构造时一次性建立）
  private _filterBank: Float32Array[]
  private _melBandWeightSum: Float32Array
  // 每带高频补偿增益（构造时算一次，抵消 1/f 滚降）
  private _tiltGain: Float32Array

  // 每 bin 的复用缓冲（避免每帧分配）
  private _dataBufferLeft: Float32Array<ArrayBuffer>
  private _dataBufferRight: Float32Array<ArrayBuffer>
  private _linearLeft: Float32Array<ArrayBuffer>
  private _linearRight: Float32Array<ArrayBuffer>

  // 时间包络状态（快攻慢放）
  private _smoothLeft = new Float32Array(NUM_MEL_BANDS)
  private _smoothRight = new Float32Array(NUM_MEL_BANDS)
  // 峰值保持状态（浮动帽）
  private _peakLeft = new Float32Array(NUM_MEL_BANDS)
  private _peakRight = new Float32Array(NUM_MEL_BANDS)

  // 每带 Mel 能量缓冲（复用）
  private _melBandsLeft = new Float32Array(NUM_MEL_BANDS)
  private _melBandsRight = new Float32Array(NUM_MEL_BANDS)
  // 最终输出（左 64 + 右 64）
  private _finalBands = new Float32Array(NUM_MEL_BANDS * 2)
  private _finalPeaks = new Float32Array(NUM_MEL_BANDS * 2)

  constructor(
    private _leftAnalyser: AnalyserNode,
    private _rightAnalyser: AnalyserNode
  ) {
    const numBins = _leftAnalyser.frequencyBinCount
    this._dataBufferLeft = new Float32Array(numBins)
    this._dataBufferRight = new Float32Array(numBins)
    this._linearLeft = new Float32Array(numBins)
    this._linearRight = new Float32Array(numBins)
    const { filterBank, weightSum } = this.createMelFilterBank(numBins, _leftAnalyser.context.sampleRate, NUM_MEL_BANDS)
    this._filterBank = filterBank
    this._melBandWeightSum = weightSum
    // 预计算低架衰减 + 中高频微抬：低频 ×VIS_LOW_GAIN（压最狠），高频 ×VIS_HIGH_GAIN（微抬），
    // 衰减强度从低频到高频递减 —— 让低频不顶满、中高频不被削。
    this._tiltGain = new Float32Array(NUM_MEL_BANDS)
    for (let i = 0; i < NUM_MEL_BANDS; i++) {
      const m = i / (NUM_MEL_BANDS - 1)
      this._tiltGain[i] = VIS_LOW_GAIN + (VIS_HIGH_GAIN - VIS_LOW_GAIN) * Math.pow(m, VIS_TILT_CURVE)
    }
  }

  /** 取一帧最终展示数据（左 64 + 右 64 拼装）。调用方需保证分析器已就绪。 */
  getBands(): VisualizationBands {
    // 1) 原始 FFT → 对数频带幅度(0~1) → 倾斜补偿 + 增益 + 软饱和
    const melLeft = this.getMelEnergy(this._leftAnalyser, this._dataBufferLeft, this._linearLeft, this._melBandsLeft)
    const melRight = this.getMelEnergy(this._rightAnalyser, this._dataBufferRight, this._linearRight, this._melBandsRight)

    // 2) 时间包络 + 峰值保持 → 最终展示用的幅度（写回 _melBands*/_peak*）
    this.applyEnvelope(melLeft, this._smoothLeft, this._peakLeft, this._melBandsLeft)
    this.applyEnvelope(melRight, this._smoothRight, this._peakRight, this._melBandsRight)

    // 3) 拼装：左 64 + 右 64
    for (let i = 0; i < NUM_MEL_BANDS; i++) {
      this._finalBands[i] = this._melBandsLeft[i]
      this._finalBands[NUM_MEL_BANDS + i] = this._melBandsRight[i]
      this._finalPeaks[i] = this._peakLeft[i]
      this._finalPeaks[NUM_MEL_BANDS + i] = this._peakRight[i]
    }

    return { bands: this._finalBands, peaks: this._finalPeaks }
  }

  // —— 内部算法 ——

  // 定义 Mel 滤波器组 (将 numBins 个线性 bin 映射到 numMelBands 个 Mel 频带)，并预计算每个频带权重和用于归一化
  private createMelFilterBank(numBins: number, sampleRate: number, numMelBands = NUM_MEL_BANDS) {
    const lowFreq = 20 // 最低频率
    const highFreq = sampleRate / 2 // Nyquist
    // 梅尔刻度是模仿人耳对频率感知的非线性刻度：mel = 2595 * log10(1 + freq / 700)
    const lowMel = 2595 * Math.log10(1 + lowFreq / 700)
    const highMel = 2595 * Math.log10(1 + highFreq / 700)
    const melPoints: number[] = []
    for (let i = 0; i <= numMelBands + 1; i++) {
      const mel = lowMel + (highMel - lowMel) * (i / (numMelBands + 1))
      const freq = 700 * (Math.pow(10, mel / 2595) - 1)
      const bin = Math.round((freq / sampleRate) * numBins)
      melPoints.push(bin)
    }

    // 构建三角窗滤波器组，并预计算每个频带的权重和用于归一化
    const filterBank: Float32Array[] = []
    const weightSum = new Float32Array(numMelBands)
    for (let i = 0; i < numMelBands; i++) {
      const start = melPoints[i]
      const center = melPoints[i + 1]
      const end = melPoints[i + 2]
      const weights = new Float32Array(numBins)
      let sum = 0
      for (let j = start; j < center; j++) {
        const w = (j - start) / (center - start)
        weights[j] = w
        sum += w
      }
      for (let j = center; j < end; j++) {
        const w = (end - j) / (end - center)
        weights[j] = w
        sum += w
      }
      weightSum[i] = sum || 1
      filterBank.push(weights)
    }
    return { filterBank, weightSum }
  }

  // 提取 Mel 频带能量：dB → 0~1 线性刻度 → 对数频带加权均值 → 倾斜补偿 + 增益 + 软饱和
  private getMelEnergy(
    analyser: AnalyserNode,
    bufferData: Float32Array<ArrayBuffer>,
    unitOut: Float32Array,
    bandsOut: Float32Array
  ): Float32Array {
    analyser.getFloatFrequencyData(bufferData)

    // 关键：FFT 返回的是分贝(dB)，必须做「分贝 → 幅度」映射，而不是直接 pow(10, db/20)。
    // 转线性幅度会把 -90~-10dB 压成 1e-4~1，可视化几乎全黑（旧版就是这个坑）。
    // 正确做法是用可调动态范围把 dB 线性映射到 0~1（网易云/MDN：h = (db-MIN)/(MAX-MIN)）。
    for (let i = 0; i < bufferData.length; i++) {
      const db = bufferData[i]
      // getFloatFrequencyData 对静音返回 -Infinity
      const unit = db <= VIS_MIN_DB ? 0 : (db - VIS_MIN_DB) / (VIS_MAX_DB - VIS_MIN_DB)
      unitOut[i] = unit < 0 ? 0 : unit > 1 ? 1 : unit
    }

    // 对数(Mel)频带：每带取所覆盖 bin 的「加权均值」（权重已归一化），
    // 保证低频宽频带与高频窄频带可比，不会因低频 bin 多而整体虚高。
    const weightSum = this._melBandWeightSum
    const tilt = this._tiltGain
    for (let i = 0; i < NUM_MEL_BANDS; i++) {
      let sum = 0
      const weights = this._filterBank[i]
      for (let j = 0; j < weights.length; j++) {
        sum += unitOut[j] * weights[j]
      }
      const avg = sum / weightSum[i]
      // 低架衰减(低频压住) + 中高频微抬 + 整体增益 + 软饱和(tanh)：低频不顶满、中高频律动、不硬削顶
      const boosted = avg * tilt[i] * VIS_BOOST
      bandsOut[i] = Math.tanh(boosted)
    }
    return bandsOut
  }

  /**
   * 幅度包络 + 峰值保持（专业可视化的核心手感，参考 Wallpaper Engine 的 MoveTowards 平滑）：
   * - 时间包络：attack 快攻（上升跟手）、release 慢放（回落柔和拖尾）→ 条子「活」地跳动。
   * - 峰值保持：峰值以固定重力缓慢下落，形成 wallpaper 那种浮动亮帽。
   * - gamma 提亮中高频（感知更通透）。
   */
  private applyEnvelope(bands: Float32Array, smoothState: Float32Array, peakState: Float32Array, bodyOut: Float32Array): void {
    for (let i = 0; i < NUM_MEL_BANDS; i++) {
      const target = bands[i]
      const prev = smoothState[i]
      // 非对称时间平滑：上升快、下降慢
      const env = prev + (target - prev) * (target > prev ? VIS_ATTACK : VIS_RELEASE)
      smoothState[i] = env

      // 峰值保持（浮动帽）：创新高则立起，否则按重力下落
      let peak = peakState[i]
      if (env > peak) peak = env
      else peak = peak * VIS_PEAK_GRAVITY
      peakState[i] = peak

      bodyOut[i] = Math.pow(env, VIS_GAMMA)
    }
  }
}
