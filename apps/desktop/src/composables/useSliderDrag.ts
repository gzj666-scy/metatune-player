import type { Ref } from 'vue'

interface DragOptions {
  /** 滑轨元素 */
  getTarget: () => HTMLElement | undefined
  /** 由事件坐标计算目标值 */
  calcValue: (clientX: number, clientY: number, rect: DOMRect) => number
  /** 值变化回调（拖动中） */
  onMove: (value: number) => void
  /** 拖动结束回调（可选） */
  onEnd?: (value: number) => void
  /** 拖动状态（由调用方持有，用于 UI 冻结显示） */
  isDragging: Ref<boolean>
}

/**
 * 滑轨拖拽（v3 自 PlayerView/PlayerStatusBar 去重）：
 * 进度条（横向）与音量条（纵向）原是两套几乎相同的 mousemove/touchmove 逻辑，合并为一个通用实现。
 */
export function useSliderDrag(options: DragOptions) {
  let currentValue = 0

  /** 统一取事件坐标（兼容鼠标/触摸） */
  const getPoint = (event: MouseEvent | TouchEvent): { x: number; y: number } => {
    if ('touches' in event) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY }
    }
    return { x: event.clientX, y: event.clientY }
  }

  /** 由事件坐标直接算出目标值（点击定位用） */
  const getEventValue = (event: MouseEvent | TouchEvent): number => {
    const target = options.getTarget()
    if (!target) return currentValue
    const point = getPoint(event)
    return options.calcValue(point.x, point.y, target.getBoundingClientRect())
  }

  const handleMove = (event: MouseEvent | TouchEvent) => {
    if (!options.isDragging.value) return
    currentValue = getEventValue(event)
    options.onMove(currentValue)
  }

  const handleEnd = () => {
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
    options.isDragging.value = false
    options.onEnd?.(currentValue)
  }

  /** 开始拖拽（绑定到 mousedown / touchstart） */
  const startDrag = (event: MouseEvent | TouchEvent) => {
    if (!options.getTarget()) return
    options.isDragging.value = true
    currentValue = getEventValue(event)
    options.onMove(currentValue)

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('touchend', handleEnd)

    event.preventDefault()
  }

  return { startDrag, getEventValue }
}
