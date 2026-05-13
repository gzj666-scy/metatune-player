import ToastBase, { ToastConfig } from '@/components/base/ToastBase.vue'
import { createApp, h, ref } from 'vue'

class ToastManager {
  private toasts: Map<
    string,
    {
      instance: ReturnType<typeof createApp>
      container: HTMLElement
    }
  > = new Map()

  // 显示 Toast
  show(config: ToastConfig): string {
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const container = document.createElement('div')
    container.id = toastId
    document.body.appendChild(container)

    const visible = ref(true)

    const handleClose = () => {
      visible.value = false
      if (config.onClose) config.onClose()
    }

    const app = createApp({
      render() {
        return h(ToastBase, {
          visible: visible.value,
          message: config.message,
          title: config.title,
          icon: config.icon,
          type: config.type,
          duration: config.duration,
          position: config.position,
          showClose: config.showClose,
          showProgress: config.showProgress,
          theme: config.theme,
          overlay: config.overlay,
          width: config.width,
          transition: config.transition,
          onClose: handleClose,
          'onUpdate:visible': (value: boolean) => {
            visible.value = value
            if (!value) {
              setTimeout(() => {
                toastManager.destroy(toastId)
              }, 300)
            }
          },
        })
      },
    })

    app.mount(container)

    this.toasts.set(toastId, { instance: app, container })

    // 自动关闭
    if (config.duration && config.duration > 0) {
      setTimeout(() => {
        handleClose()
      }, config.duration)
    }

    return toastId
  }

  // 显示成功 Toast
  success(message: string, title?: string): string {
    return this.show({
      message,
      title,
      type: 'success',
      duration: 3000,
    })
  }

  // 显示错误 Toast
  error(message: string, title?: string): string {
    return this.show({
      message,
      title,
      type: 'error',
      duration: 3000,
    })
  }

  // 显示警告 Toast
  warning(message: string, title?: string): string {
    return this.show({
      message,
      title,
      type: 'warning',
      duration: 3500,
    })
  }

  // 显示信息 Toast
  info(message: string, title?: string): string {
    return this.show({
      message,
      title,
      type: 'info',
      duration: 3000,
    })
  }

  // 显示加载中 Toast
  loading(message: string, title?: string): string {
    return this.show({
      message,
      title,
      type: 'loading',
      duration: 0, // 不自动关闭
    })
  }

  // 隐藏 Toast
  hide(id: string) {
    const toast = this.toasts.get(id)
    if (toast) {
      toast.instance.unmount()
      document.body.removeChild(toast.container)
      this.toasts.delete(id)
    }
  }

  // 隐藏所有 Toast
  hideAll() {
    this.toasts.forEach((_, id) => {
      this.hide(id)
    })
  }

  // 销毁 Toast
  destroy(id: string) {
    this.hide(id)
  }
}

const toastManager = new ToastManager()

export const Toast = {
  show: (config: ToastConfig) => toastManager.show(config),
  success: (message: string, title?: string) => toastManager.success(message, title),
  error: (message: string, title?: string) => toastManager.error(message, title),
  warning: (message: string, title?: string) => toastManager.warning(message, title),
  info: (message: string, title?: string) => toastManager.info(message, title),
  loading: (message: string, title?: string) => toastManager.loading(message, title),
  hide: (id: string) => toastManager.hide(id),
  hideAll: () => toastManager.hideAll(),
}
