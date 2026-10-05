import { ref, watchEffect, onUnmounted, type Ref } from 'vue'

interface SpectrumData {
  /** 128 帧（左 64 + 右 64）最终展示幅度，0~1 */
  bands: Float32Array
  /** 128 帧（左 64 + 右 64）峰值帽幅度，0~1 */
  peaks: Float32Array
}

interface SpectrumOptions {
  canvasRef: Ref<HTMLCanvasElement | undefined>
  /** 频谱数据源，返回 null 时跳帧 */
  getData: () => SpectrumData | null
  /** 绘制是否启用（设置开关） */
  enabledRef: Ref<boolean>
  /** 是否正在播放 */
  isPlayingRef: Ref<boolean>
  /** 主题渐变色 CSS 变量 */
  themeVarsRef: Ref<Record<string, string>>
}

/**
 * 频谱可视化（v3 自 PlayerView 抽出）：
 * 封装 canvas 尺寸自适应（DPR 防模糊）、ResizeObserver、按帧定时绘制与启停控制。
 * 注意：数据本身的处理（dB→幅度映射、对数频带、时间包络、峰值保持）都在 AudioVisualizer 内完成，
 * 这里只负责「把已处理好的 0~1 数据画出来」，不包含任何律动算法。
 */
export function useSpectrum(options: SpectrumOptions) {
  // 30fps：细条律动低于此值会有明显顿挫感
  const drawIntervalRef = ref(1000 / 30)
  const drawTimerRef = ref<number>()
  const resizeObserverRef = ref<ResizeObserver>()

  const { canvasRef, getData, enabledRef, isPlayingRef, themeVarsRef } = options

  /** 读取主题色变量，未就绪时给兜底色（避免 addColorStop 抛错断掉绘制循环） */
  const themeColor = (key: string, fallback: string) => themeVarsRef.value[key] || fallback

  /** 绘制一帧频谱（酷狗/wallpaper 风格：低频居中的镜像山形细条 + 浮动峰值帽） */
  const drawSpectrum = () => {
    clearTimeout(drawTimerRef.value)
    if (!enabledRef.value) return
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (!isPlayingRef.value) return
    const data = getData()
    if (!data) return

    // 由于 ctx.scale(dpr)，绘图时要转回 CSS 像素坐标
    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr
    ctx.clearRect(0, 0, width, height)

    const barCount = 128

    // 1) 镜像重排：左声道镜像到中轴左侧、右声道顺排到中轴右侧 → 低频居中、高频在两端，
    //    低频能量天然更大，自动形成「中间高、两边低」的对称山形（酷狗同款形态）
    const bands = new Float32Array(barCount)
    const peaks = new Float32Array(barCount)
    for (let j = 0; j < 64; j++) {
      bands[63 - j] = data.bands[j]
      bands[64 + j] = data.bands[64 + j]
      peaks[63 - j] = data.peaks[j]
      peaks[64 + j] = data.peaks[64 + j]
    }

    // 2) 空间平滑：相邻 3 点加权平均，让相邻条包络过渡顺滑、不成锯齿（廉价、可选）
    const envelope = new Float32Array(barCount)
    const envPeaks = new Float32Array(barCount)
    for (let i = 0; i < barCount; i++) {
      const prev = bands[Math.max(0, i - 1)]
      const next = bands[Math.min(barCount - 1, i + 1)]
      envelope[i] = bands[i] * 0.5 + prev * 0.25 + next * 0.25
      const pPrev = peaks[Math.max(0, i - 1)]
      const pNext = peaks[Math.min(barCount - 1, i + 1)]
      envPeaks[i] = peaks[i] * 0.5 + pPrev * 0.25 + pNext * 0.25
    }

    // 3) 布局：细条占槽位 55%（条宽约 2-3px、间隙均匀），左右不留白
    const slot = width / barCount
    const barWidth = Math.max(1, slot * 0.55)

    // 4) 垂直渐变：顶部亮（主题中色）→ 底部淡（主题左色），即「底暗顶亮」的融入感
    const bodyGradient = ctx.createLinearGradient(0, 0, 0, height)
    bodyGradient.addColorStop(0, themeColor('--player-canvas-m', '#cbb8f0'))
    bodyGradient.addColorStop(1, themeColor('--player-canvas-l', '#8a76c9'))

    // 主体细条（批量子路径一次填充）
    ctx.fillStyle = bodyGradient
    ctx.beginPath()
    for (let i = 0; i < barCount; i++) {
      const barHeight = 2 + envelope[i] * (height - 2) // 最小 2px 保留贴底基线
      const x = i * slot + (slot - barWidth) / 2
      ctx.rect(x, height - barHeight, barWidth, barHeight)
    }
    ctx.fill()

    // 5) 顶部高光：白色渐变只罩条形上半段，模拟「条顶亮头」质感
    const capGradient = ctx.createLinearGradient(0, height * 0.3, 0, height)
    capGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)')
    capGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = capGradient
    ctx.beginPath()
    for (let i = 0; i < barCount; i++) {
      const barHeight = 2 + envelope[i] * (height - 2)
      const x = i * slot + (slot - barWidth) / 2
      ctx.rect(x, height - barHeight, barWidth, barHeight)
    }
    ctx.fill()

    // 6) 浮动峰值帽：在每根条峰值高度处画一条 2px 亮线（wallpaper 标志性效果）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    for (let i = 0; i < barCount; i++) {
      const peakHeight = 2 + envPeaks[i] * (height - 2)
      const x = i * slot + (slot - barWidth) / 2
      ctx.rect(x, height - peakHeight - 1, barWidth, 2)
    }
    ctx.fill()

    drawTimerRef.value = window.setTimeout(drawSpectrum, drawIntervalRef.value)
  }

  const start = () => {
    clearTimeout(drawTimerRef.value)
    drawTimerRef.value = window.setTimeout(drawSpectrum, drawIntervalRef.value)
  }

  const stop = () => {
    clearTimeout(drawTimerRef.value)
  }

  /** 清空画布 */
  const clearCanvas = () => {
    stop()
    const canvas = canvasRef.value
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }

  /** 画布尺寸随容器自适应（DPR 防模糊） */
  const setupCanvas = () => {
    stop()
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = false // 频谱图不需要抗锯齿，提升性能
    start()
  }

  // canvas 挂载后监听容器尺寸变化
  watchEffect(
    () => {
      if (canvasRef.value) {
        resizeObserverRef.value?.disconnect()
        resizeObserverRef.value = new ResizeObserver(() => setupCanvas())
        resizeObserverRef.value.observe(canvasRef.value.parentElement!)
      }
    },
    { flush: 'post' }
  )

  onUnmounted(() => {
    stop()
    resizeObserverRef.value?.disconnect()
  })

  return { start, stop, clearCanvas }
}
