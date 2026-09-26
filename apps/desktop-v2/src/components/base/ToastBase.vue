<template>
  <Transition :name="transitionName">
    <div v-if="visible" class="toast-container" :class="toastClass" :style="toastStyle" @mouseenter="pauseTimer" @mouseleave="resumeTimer">
      <div class="toast-content">
        <!-- 图标 -->
        <div v-if="icon" class="toast-icon">
          <span class="icon-text">{{ icon }}</span>
        </div>

        <!-- 消息内容 -->
        <div class="toast-message">
          <div v-if="title" class="toast-title">{{ title }}</div>
          <div v-if="message" class="toast-text">{{ message }}</div>
        </div>

        <!-- 关闭按钮 -->
        <button v-if="showClose" class="toast-close" @click="close">
          <svg class="close-icon" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <!-- 进度条 -->
      <div v-if="duration > 0 && showProgress" class="toast-progress" :style="progressStyle"></div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

  export interface ToastConfig {
    message: string
    title?: string
    icon?: string
    type?: 'info' | 'success' | 'warning' | 'error' | 'loading'
    duration?: number
    position?: 'top' | 'center' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    showClose?: boolean
    showProgress?: boolean
    theme?: 'light' | 'dark'
    overlay?: boolean
    width?: string | number
    transition?: 'fade' | 'slide' | 'zoom'
    onClose?: () => void
  }

  interface Props extends ToastConfig {
    visible: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    type: 'info',
    duration: 3000,
    position: 'center',
    showClose: true,
    showProgress: true,
    theme: 'light',
    overlay: false,
    width: 320,
    transition: 'fade',
  })

  const emit = defineEmits<{
    'update:visible': [visible: boolean]
    close: []
  }>()

  // 响应式状态
  const isHovered = ref(false)
  const startTime = ref(0)
  const remainingTime = ref(props.duration)
  const timer = ref<number | null>(null)

  // 计算属性
  const toastClass = computed(() => {
    const classes = [`theme-${props.theme}`, `type-${props.type}`, `position-${props.position}`, props.overlay ? 'has-overlay' : '']
    return classes
  })

  const toastStyle = computed(() => {
    const style: Record<string, string> = {}
    if (props.width) {
      style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
    }
    return style
  })

  const transitionName = computed(() => {
    if (props.transition === 'fade') return 'toast-fade'
    if (props.transition === 'slide') return 'toast-slide'
    if (props.transition === 'zoom') return 'toast-zoom'
    return 'toast-fade'
  })

  const progressStyle = computed(() => {
    if (!props.duration || props.duration <= 0) return {}

    const progressPercent = (remainingTime.value / props.duration) * 100
    return {
      width: `${progressPercent}%`,
      transition: isHovered.value ? 'none' : 'width 1s linear',
    }
  })

  // 自动关闭定时器
  const startTimer = () => {
    if (props.duration <= 0) return

    startTime.value = Date.now()
    remainingTime.value = props.duration

    if (timer.value) {
      clearInterval(timer.value)
    }

    timer.value = window.setInterval(() => {
      if (isHovered.value) return

      const elapsed = Date.now() - startTime.value
      remainingTime.value = props.duration - elapsed

      if (remainingTime.value <= 0) {
        close()
      }
    }, 100)
  }

  const pauseTimer = () => {
    isHovered.value = true
  }

  const resumeTimer = () => {
    isHovered.value = false
    startTime.value = Date.now() - (props.duration - remainingTime.value)
  }

  // 方法
  const close = () => {
    emit('update:visible', false)
    emit('close')
    props.onClose?.()

    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }

  // 监听可见性变化
  watch(
    () => props.visible,
    newVal => {
      if (newVal) {
        // 重置状态
        isHovered.value = false
        remainingTime.value = props.duration

        // 开始计时
        if (props.duration > 0) {
          startTimer()
        }
      } else {
        // 清理定时器
        if (timer.value) {
          clearInterval(timer.value)
          timer.value = null
        }
      }
    }
  )

  // 监听持续时间变化
  watch(
    () => props.duration,
    () => {
      if (props.visible && !isHovered.value) {
        startTimer()
      }
    }
  )

  // 生命周期
  onMounted(() => {
    if (props.visible && props.duration > 0) {
      startTimer()
    }
  })

  onUnmounted(() => {
    if (timer.value) {
      clearInterval(timer.value)
    }
  })
</script>

<style lang="scss" scoped>
  .toast-container {
    position: fixed;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    max-width: 90vw;

    &.theme-light {
      --toast-bg: #ffffff;
      --toast-text: #333333;
      --toast-border: #e0e0e0;
      --toast-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &.theme-dark {
      --toast-bg: #2d2d2d;
      --toast-text: #ffffff;
      --toast-border: #404040;
      --toast-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    &.type-info {
      --toast-icon-color: #0066cc;
    }

    &.type-success {
      --toast-icon-color: #4caf50;
    }

    &.type-warning {
      --toast-icon-color: #ff9800;
    }

    &.type-error {
      --toast-icon-color: #f44336;
    }

    &.type-loading {
      --toast-icon-color: #0066cc;
    }

    &.has-overlay {
      background: var(--toast-overlay, rgba(0, 0, 0, 0.5));
      border-radius: 8px;
    }

    // 位置
    &.position-top {
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
    }

    &.position-bottom {
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
    }

    &.position-center {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    &.position-top-left {
      top: 20px;
      left: 20px;
    }

    &.position-top-right {
      top: 20px;
      right: 20px;
    }

    &.position-bottom-left {
      bottom: 20px;
      left: 20px;
    }

    &.position-bottom-right {
      bottom: 20px;
      right: 20px;
    }
  }

  .toast-content {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    background: var(--toast-bg, #ffffff);
    border-radius: 8px;
    box-shadow: var(--toast-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
    min-height: 60px;
    gap: 12px;
  }

  .toast-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--toast-icon-color, #0066cc);
    font-size: 20px;

    &.type-loading {
      .icon-text {
        animation: toast-loading 1s linear infinite;
      }
    }
  }

  .toast-message {
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  .toast-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--toast-text, #333333);
    margin-bottom: 4px;
    line-height: 1.4;
  }

  .toast-text {
    font-size: 13px;
    color: var(--toast-text, #333333);
    line-height: 1.5;
    word-break: break-word;
  }

  .toast-close {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--toast-text, #333333);
    opacity: 0.6;
    flex-shrink: 0;
    transition: all 0.2s;
    margin-left: 8px;

    &:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.1);
    }

    .close-icon {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
  }

  .toast-progress {
    height: 3px;
    background: var(--toast-icon-color, #0066cc);
    border-radius: 0 0 8px 8px;
    align-self: flex-start;
    transition: width 1s linear;
  }

  // 动画
  .toast-fade-enter-active,
  .toast-fade-leave-active {
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
  }

  .toast-fade-enter-from,
  .toast-fade-leave-to {
    opacity: 0;
  }

  .toast-slide-enter-active,
  .toast-slide-leave-active {
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
  }

  .toast-slide-enter-from {
    opacity: 0;
    transform: translateY(-20px);
  }

  .toast-slide-leave-to {
    opacity: 0;
    transform: translateY(-20px);
  }

  .toast-zoom-enter-active,
  .toast-zoom-leave-active {
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
  }

  .toast-zoom-enter-from {
    opacity: 0;
    transform: scale(0.9);
  }

  .toast-zoom-leave-to {
    opacity: 0;
    transform: scale(0.9);
  }

  @keyframes toast-loading {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
