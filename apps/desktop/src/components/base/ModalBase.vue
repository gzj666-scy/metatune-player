<template>
  <Transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" @click.self="onOverlayClick">
      <div class="modal-container" :class="classNames?.root">
        <div v-if="title" class="modal-header">
          <div class="modal-title">{{ title }}</div>
          <button v-if="showClose" :class="'modal-close'" @click="onClose">
            <IconBase class="close-icon">
              <component :is="IconEnum.Close" />
            </IconBase>
          </button>
        </div>

        <div class="modal-content" :class="classNames?.content">
          <slot />
        </div>

        <div v-if="showFooter" class="modal-footer" :class="classNames?.footer">
          <button v-if="showCancel" class="modal-btn modal-btn-cancel" :class="cancelButtonClass" @click="onCancel" :disabled="isWaiting">
            {{ cancelText }}
          </button>
          <button class="modal-btn modal-btn-confirm" :class="confirmButtonClass" @click="onConfirm" :disabled="isWaiting" ref="confirmButton">
            <span v-if="isWaiting" class="loading-spinner"></span>
            <span v-else>{{ confirmText }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
  import { IconEnum } from '@metatune/common'
  import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue'
  import IconBase from './IconBase.vue'

  export interface ModalConfig {
    visible?: boolean
    title?: string
    showClose?: boolean
    showFooter?: boolean
    showCancel?: boolean
    cancelText?: string
    confirmText?: string
    cancelButtonClass?: string
    confirmButtonClass?: string
    maskClosable?: boolean
    autoFocus?: boolean
    classNames?: { root?: string; header?: string; content?: string; footer?: string }
    onConfirm?: (inputValue?: string) => void | Promise<void>
    onCancel?: () => void
    onClose?: () => void
  }

  const props = withDefaults(defineProps<ModalConfig>(), {
    visible: false,
    showClose: true,
    showFooter: true,
    showCancel: true,
    cancelText: '取消',
    confirmText: '确定',
    maskClosable: true,
    autoFocus: true,
  })

  const emit = defineEmits<{
    confirm: []
    cancel: []
    close: []
  }>()

  const isWaiting = ref(false)

  const onClose = () => {
    if (isWaiting.value) return
    props.onClose?.()
  }

  const onOverlayClick = () => {
    if (isWaiting.value) return
    if (props.maskClosable) {
      onClose()
    }
  }

  const onCancel = () => {
    if (isWaiting.value) return
    if (props.onCancel) {
      props.onCancel()
    } else {
      props.onClose?.()
    }
  }

  const onConfirm = async () => {
    if (isWaiting.value) return
    isWaiting.value = true

    try {
      await props.onConfirm?.()
    } finally {
      isWaiting.value = false
    }
  }

  // 监听可见性变化
  watch(
    () => props.visible,
    newVal => {
      if (newVal) {
        isWaiting.value = false
        // 自动聚焦确认按钮
        if (props.autoFocus && props.showFooter) {
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
        onClose()
        break
      case 'Enter':
        event.preventDefault()
        onConfirm()
        break
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
</script>

<style lang="scss" scoped>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    animation: overlay-fade 0.2s ease;

    .modal-container {
      border-radius: 8px;
      background: var(--modal-bg);
      box-shadow: var(--modal-shadow);
      max-width: 80%;
      max-height: 80%;
      overflow: hidden;
      animation: modal-slide 0.2s ease;
      display: flex;
      flex-direction: column;

      .modal-header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        border-bottom: 1px solid #e0e0e0;

        .modal-title {
          font-size: 16px;
          font-weight: 600;
        }

        .modal-close {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-color-secondary);
          transition: all 0.2s;
          margin-left: 12px;

          &:hover {
            filter: brightness(0.5);
          }
        }
      }

      .modal-content {
        padding: 12px;
        overflow-y: auto;
        flex: 1;
      }

      .modal-footer {
        flex-shrink: 0;
        display: flex;
        gap: 12px;
        padding: 12px;
        border-top: 1px solid #e0e0e0;

        .modal-btn {
          flex: 1;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }

        .modal-btn-cancel {
          background: var(--btn-secondary-bg);
          color: var(--btn-secondary-text);

          &:hover:not(:disabled) {
            background: var(--btn-secondary-hover-bg);
          }
        }

        .modal-btn-confirm {
          background: var(--btn-primary-bg);
          color: var(--btn-primary-text);

          &:hover:not(:disabled) {
            background: var(--btn-primary-hover-bg);
          }

          .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spinner 0.8s linear infinite;
          }
        }
      }
    }
  }

  @keyframes overlay-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes modal-slide {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes spinner {
    to {
      transform: rotate(360deg);
    }
  }

  .modal-fade-enter-active,
  .modal-fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .modal-fade-enter-from,
  .modal-fade-leave-to {
    opacity: 0;
  }
</style>
