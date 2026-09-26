<template>
  <Transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" @click.self="handleOverlayClick">
      <div class="modal-container" :class="modalClass" :style="modalStyle">
        <!-- 标题 -->
        <div v-if="title" class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button v-if="showClose" class="modal-close" @click="handleClose">
            <svg class="close-icon" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <!-- 内容 -->
        <div class="modal-content">
          <!-- 图标 -->
          <div v-if="icon" class="modal-icon">
            <span class="icon-text">{{ icon }}</span>
          </div>

          <!-- 消息内容 -->
          <div v-if="typeof content === 'string'" class="modal-message">
            {{ content }}
          </div>
          <div v-else-if="content" class="modal-message">
            <component :is="content" />
          </div>

          <!-- 输入框 -->
          <div v-if="showInput" class="modal-input">
            <input v-model="inputValue" :type="inputType" :placeholder="inputPlaceholder" class="modal-input-field" @keyup.enter="handleConfirm" />
          </div>
        </div>

        <!-- 按钮区域 -->
        <div class="modal-footer">
          <button v-if="showCancel" class="modal-btn modal-btn-cancel" :class="cancelButtonClass" @click="handleCancel">
            {{ cancelText }}
          </button>
          <button class="modal-btn modal-btn-confirm" :class="confirmButtonClass" @click="handleConfirm" :disabled="isConfirming" ref="confirmButton">
            <span v-if="isConfirming" class="loading-spinner"></span>
            <span v-else>{{ confirmText }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, nextTick, watch, VNode } from 'vue'

  export interface ModalConfig {
    title?: string
    content?: string | VNode
    icon?: string
    showCancel?: boolean
    showClose?: boolean
    showInput?: boolean
    inputType?: string
    inputPlaceholder?: string
    cancelText?: string
    confirmText?: string
    cancelButtonClass?: string
    confirmButtonClass?: string
    maskClosable?: boolean
    width?: string | number
    theme?: 'light' | 'dark'
    type?: 'info' | 'success' | 'warning' | 'error' | 'confirm'
    autoFocus?: boolean
    loading?: boolean
    onConfirm?: (inputValue?: string) => void | Promise<void>
    onCancel?: () => void
    onClose?: () => void
  }

  interface Props extends ModalConfig {
    visible: boolean
    // content?: string | any
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    showCancel: true,
    showClose: true,
    showInput: false,
    inputType: 'text',
    inputPlaceholder: '请输入',
    cancelText: '取消',
    confirmText: '确定',
    maskClosable: true,
    width: 400,
    theme: 'light',
    type: 'info',
    autoFocus: true,
    loading: false,
  })

  const emit = defineEmits<{
    'update:visible': [visible: boolean]
    confirm: [inputValue?: string]
    cancel: []
    close: []
  }>()

  // 响应式状态
  const inputValue = ref('')
  const isConfirming = ref(false)

  // 计算属性
  const modalClass = computed(() => {
    const classes = [`theme-${props.theme}`, `type-${props.type}`]
    if (props.showInput) classes.push('has-input')
    return classes
  })

  const modalStyle = computed(() => {
    const style: Record<string, string> = {}
    if (props.width) {
      style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
    }
    return style
  })

  // 方法
  const handleClose = () => {
    emit('update:visible', false)
    emit('close')
  }

  const handleOverlayClick = () => {
    if (props.maskClosable) {
      handleClose()
    }
  }

  const handleCancel = () => {
    emit('update:visible', false)
    emit('cancel')
  }

  const handleConfirm = async () => {
    if (props.loading) {
      isConfirming.value = true
    }

    try {
      emit('confirm', props.showInput ? inputValue.value : undefined)

      // 如果不是异步操作，立即关闭
      if (!props.loading) {
        emit('update:visible', false)
      }
    } finally {
      if (props.loading) {
        isConfirming.value = false
      }
    }
  }

  // 监听可见性变化
  watch(
    () => props.visible,
    newVal => {
      if (newVal) {
        // 重置输入值
        inputValue.value = ''
        isConfirming.value = false

        // 自动聚焦确认按钮
        if (props.autoFocus) {
          nextTick(() => {
            const button = document.querySelector('.modal-btn-confirm') as HTMLButtonElement
            button?.focus()
          })
        }
      }
    }
  )

  // 键盘事件监听
  const handleKeydown = (event: KeyboardEvent) => {
    if (!props.visible) return

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        handleClose()
        break
      case 'Enter':
        if (!props.showInput) {
          event.preventDefault()
          handleConfirm()
        }
        break
    }
  }

  // 生命周期
  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  // 清理
  import { onUnmounted } from 'vue'
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
</script>

<style lang="scss" scoped>
  // .modal-overlay {
  //   position: fixed;
  //   top: 0;
  //   left: 0;
  //   right: 0;
  //   bottom: 0;
  //   background: rgba(0, 0, 0, 0.5);
  //   display: flex;
  //   align-items: center;
  //   justify-content: center;
  //   z-index: 10000;
  //   animation: overlay-fade 0.3s ease;
  //   padding: 20px;
  // }

  // .modal-container {
  //   background: var(--modal-bg, #ffffff);
  //   border-radius: 8px;
  //   box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  //   max-width: 90%;
  //   max-height: 90%;
  //   overflow: hidden;
  //   animation: modal-slide 0.3s ease;
  //   display: flex;
  //   flex-direction: column;

  //   &.theme-dark {
  //     --modal-bg: #1e1e1e;
  //     --modal-text: #ffffff;
  //     --modal-border: #404040;
  //     --modal-btn-bg: #2d2d2d;
  //     --modal-btn-hover: #3d3d3d;
  //   }

  //   &.theme-light {
  //     --modal-bg: #ffffff;
  //     --modal-text: #333333;
  //     --modal-border: #e0e0e0;
  //     --modal-btn-bg: #f5f5f5;
  //     --modal-btn-hover: #e8e8e8;
  //   }

  //   &.type-info {
  //     --modal-icon-color: #0066cc;
  //   }

  //   &.type-success {
  //     --modal-icon-color: #4caf50;
  //   }

  //   &.type-warning {
  //     --modal-icon-color: #ff9800;
  //   }

  //   &.type-error {
  //     --modal-icon-color: #f44336;
  //   }

  //   &.type-confirm {
  //     --modal-icon-color: #0066cc;
  //   }
  // }

  // .modal-header {
  //   display: flex;
  //   align-items: center;
  //   justify-content: space-between;
  //   padding: 20px 24px 16px;
  //   border-bottom: 1px solid var(--modal-border, #e0e0e0);
  // }

  // .modal-title {
  //   margin: 0;
  //   font-size: 18px;
  //   font-weight: 600;
  //   color: var(--modal-text, #333333);
  //   line-height: 1.4;
  // }

  // .modal-close {
  //   width: 32px;
  //   height: 32px;
  //   border-radius: 6px;
  //   border: none;
  //   background: transparent;
  //   display: flex;
  //   align-items: center;
  //   justify-content: center;
  //   cursor: pointer;
  //   color: var(--modal-text, #333333);
  //   opacity: 0.6;
  //   transition: all 0.2s;
  //   margin-left: 12px;

  //   &:hover {
  //     opacity: 1;
  //     background: var(--modal-btn-hover, #f0f0f0);
  //   }

  //   .close-icon {
  //     width: 20px;
  //     height: 20px;
  //     fill: currentColor;
  //   }
  // }

  // .modal-content {
  //   padding: 24px;
  //   overflow-y: auto;
  //   flex: 1;
  //   display: flex;
  //   flex-direction: column;
  //   align-items: center;
  //   text-align: center;
  // }

  // .modal-icon {
  //   width: 60px;
  //   height: 60px;
  //   border-radius: 50%;
  //   background: var(--modal-icon-color, #0066cc);
  //   color: white;
  //   display: flex;
  //   align-items: center;
  //   justify-content: center;
  //   margin-bottom: 20px;
  //   font-size: 30px;
  //   flex-shrink: 0;

  //   .icon-text {
  //     font-size: inherit;
  //   }
  // }

  // .modal-message {
  //   font-size: 15px;
  //   line-height: 1.5;
  //   color: var(--modal-text, #333333);
  //   margin-bottom: 20px;
  //   word-break: break-word;
  //   max-width: 100%;

  //   &:last-child {
  //     margin-bottom: 0;
  //   }
  // }

  // .modal-input {
  //   width: 100%;
  //   margin-bottom: 20px;

  //   .modal-input-field {
  //     width: 100%;
  //     padding: 12px 16px;
  //     border: 1px solid var(--modal-border, #e0e0e0);
  //     border-radius: 6px;
  //     font-size: 14px;
  //     background: var(--modal-bg, #ffffff);
  //     color: var(--modal-text, #333333);
  //     transition: border-color 0.2s;

  //     &:focus {
  //       outline: none;
  //       border-color: var(--modal-icon-color, #0066cc);
  //     }

  //     &::placeholder {
  //       color: var(--modal-text, #333333);
  //       opacity: 0.6;
  //     }
  //   }
  // }

  // .modal-footer {
  //   display: flex;
  //   gap: 12px;
  //   padding: 20px 24px;
  //   border-top: 1px solid var(--modal-border, #e0e0e0);
  //   background: var(--modal-btn-bg, #f8f8f8);

  //   &.has-input {
  //     background: transparent;
  //     border-top: none;
  //     padding-top: 0;
  //   }
  // }

  // .modal-btn {
  //   flex: 1;
  //   padding: 12px 24px;
  //   border-radius: 6px;
  //   border: none;
  //   font-size: 14px;
  //   font-weight: 500;
  //   cursor: pointer;
  //   transition: all 0.2s;
  //   display: flex;
  //   align-items: center;
  //   justify-content: center;
  //   min-height: 44px;

  //   &:disabled {
  //     opacity: 0.6;
  //     cursor: not-allowed;
  //   }
  // }

  // .modal-btn-cancel {
  //   background: var(--modal-btn-bg, #f5f5f5);
  //   color: var(--modal-text, #333333);

  //   &:hover:not(:disabled) {
  //     background: var(--modal-btn-hover, #e8e8e8);
  //   }

  //   &:active:not(:disabled) {
  //     transform: translateY(1px);
  //   }
  // }

  // .modal-btn-confirm {
  //   background: var(--modal-icon-color, #0066cc);
  //   color: white;

  //   &:hover:not(:disabled) {
  //     background: var(--modal-icon-color, #0052a3);
  //   }

  //   &:active:not(:disabled) {
  //     transform: translateY(1px);
  //   }

  //   .loading-spinner {
  //     width: 20px;
  //     height: 20px;
  //     border: 2px solid rgba(255, 255, 255, 0.3);
  //     border-radius: 50%;
  //     border-top-color: white;
  //     animation: spinner 0.8s linear infinite;
  //   }
  // }

  // @keyframes overlay-fade {
  //   from {
  //     opacity: 0;
  //   }
  //   to {
  //     opacity: 1;
  //   }
  // }

  // @keyframes modal-slide {
  //   from {
  //     opacity: 0;
  //     transform: translateY(-20px) scale(0.95);
  //   }
  //   to {
  //     opacity: 1;
  //     transform: translateY(0) scale(1);
  //   }
  // }

  // @keyframes spinner {
  //   to {
  //     transform: rotate(360deg);
  //   }
  // }

  // .modal-fade-enter-active,
  // .modal-fade-leave-active {
  //   transition: opacity 0.3s ease;
  // }

  // .modal-fade-enter-from,
  // .modal-fade-leave-to {
  //   opacity: 0;
  // }
</style>
