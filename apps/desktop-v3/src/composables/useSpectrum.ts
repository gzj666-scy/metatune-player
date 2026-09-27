import { ref, watchEffect, onUnmounted, type Ref } from 'vue'
import { addRoundedTopSubpath } from '@metatune/common-v3'

interface SpectrumOptions {
  canvasRef: Ref<HTMLCanvasElement | undefined>
  /** 频谱数据源（128 帧：左 64 + 右 64），返回 null 时跳帧 */
  getData: () => Float32Array | null
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
 */
export function useSpectrum(options: SpectrumOptions) {
  const drawIntervalRef = ref(1000 / 15)
  const drawTimerRef = ref<number>()
  const resizeObserverRef = ref<ResizeObserver>()

  const { canvasRef, getData, enabledRef, isPlayingRef, themeVarsRef } = options

  /** 绘制一帧频谱 */
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

    const margin = 8 // 左右留白
    const usableWidth = width - margin * 2
    const barCount = data.length
    const barGap = usableWidth / (barCount * 2 - 1)
    const barWidth = barGap

    // 从右到左的主题渐变
    const gradient = ctx.createLinearGradient(width, 0, 0, 0)
    gradient.addColorStop(0, themeVarsRef.value['--player-canvas-r']) // (右)
    gradient.addColorStop(0.5, themeVarsRef.value['--player-canvas-m']) // (中)
    gradient.addColorStop(1, themeVarsRef.value['--player-canvas-l']) // (左)

    // 批量添加子路径后一次性填充（性能优化）
    ctx.fillStyle = gradient
    ctx.beginPath()
    for (let i = 0; i < barCount; i++) {
      const value = data[i]
      const barHeight = 3 + value * height
      const x = margin + i * (barWidth + barGap)
      const y = height - barHeight
      addRoundedTopSubpath(ctx, x, y, barWidth, barHeight, 10)
    }
    ctx.closePath()
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
