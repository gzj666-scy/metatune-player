import { createApp, h, ref, watch } from 'vue'
import NoticeModal, { NoticeModalProps } from '@/components/modal/NoticeModal.vue'

class ModalManager {
  private modals: Map<
    string,
    {
      instance: ReturnType<typeof createApp>
      container: HTMLElement
    }
  > = new Map()

  // 显示 Modal
  async show(config: NoticeModalProps): Promise<{ confirm: boolean; value?: string }> {
    return new Promise(resolve => {
      const modalId = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const container = document.createElement('div')
      container.id = modalId
      document.body.appendChild(container)

      const visible = ref(true)

      const handleConfirm = async (inputValue?: string) => {
        if (config.onConfirm) {
          try {
            await config.onConfirm()
          } catch (error) {
            console.error('Modal confirm error:', error)
            return
          }
        }
        visible.value = false
        resolve({ confirm: true, value: inputValue })
      }

      const handleCancel = () => {
        if (config.onCancel) config.onCancel()
        visible.value = false
        resolve({ confirm: false })
      }

      const handleClose = () => {
        if (config.onClose) config.onClose()
        visible.value = false
        resolve({ confirm: false })
      }

      const app = createApp({
        render() {
          return h(NoticeModal, {
            visible: visible.value,
            title: config.title,
            content: config.content,
            icon: config.icon,
            showCancel: config.showCancel,
            showClose: config.showClose,
            showInput: config.showInput,
            inputType: config.inputType,
            inputPlaceholder: config.inputPlaceholder,
            defaultValue: config.defaultValue,
            cancelText: config.cancelText,
            confirmText: config.confirmText,
            cancelButtonClass: config.cancelButtonClass,
            confirmButtonClass: config.confirmButtonClass,
            maskClosable: config.maskClosable,
            type: config.type,
            autoFocus: config.autoFocus,
            onConfirm: handleConfirm,
            onCancel: handleCancel,
            onClose: handleClose,
          })
        },
      })

      app.mount(container)

      this.modals.set(modalId, { instance: app, container })

      // 监听关闭
      const unwatch = watch(visible, newVal => {
        if (!newVal) {
          window.setTimeout(() => {
            this.destroy(modalId)
            unwatch()
          }, 300)
        }
      })
    })
  }

  // 显示确认对话框
  confirm(content: string, title: string = '确认'): Promise<boolean> {
    return this.show({
      title,
      content,
      type: 'confirm',
      showCancel: true,
    }).then(result => result.confirm)
  }

  // 显示提示对话框
  alert(content: string, title: string = '提示'): Promise<void> {
    return this.show({
      title,
      content,
      type: 'info',
      showCancel: false,
    }).then(() => {})
  }

  // 显示输入对话框
  prompt(title: string = '请输入', content: string = '', defaultValue: string = '', placeholder: string = ''): Promise<string | null> {
    return this.show({
      title,
      content,
      showInput: true,
      inputType: 'text',
      inputPlaceholder: placeholder,
      defaultValue: defaultValue,
      showCancel: true,
    }).then(result => (result.confirm ? result.value || '' : null))
  }

  // 销毁 Modal
  private destroy(id: string) {
    const modal = this.modals.get(id)
    if (modal) {
      modal.instance.unmount()
      document.body.removeChild(modal.container)
      this.modals.delete(id)
    }
  }

  // 销毁所有 Modal
  destroyAll() {
    this.modals.forEach((_, id) => {
      this.destroy(id)
    })
  }
}

const modalManager = new ModalManager()

export const Modal = {
  show: (config: NoticeModalProps) => modalManager.show(config),
  confirm: (content: string, title?: string) => modalManager.confirm(content, title),
  alert: (content: string, title?: string) => modalManager.alert(content, title),
  prompt: (title: string, content?: string, defaultValue?: string, placeholder?: string) =>
    modalManager.prompt(title, content, defaultValue, placeholder),
}
