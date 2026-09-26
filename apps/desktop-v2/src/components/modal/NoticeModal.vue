<script setup lang="ts">
  import { computed, ref, VNode } from 'vue'
  import ModalBase, { ModalConfig } from '../base/ModalBase.vue'

  export interface NoticeModalProps extends ModalConfig {
    icon?: string | VNode
    content?: string | VNode
    type?: 'info' | 'success' | 'warning' | 'error' | 'confirm'
    showInput?: boolean
    inputType?: string
    inputPlaceholder?: string
    defaultValue?: string
  }

  const props = withDefaults(defineProps<NoticeModalProps>(), {
    visible: false,
    showCancel: true,
    showClose: true,
    type: 'info',
    showInput: false,
    inputType: 'text',
    inputPlaceholder: '请输入',
    defaultValue: '',
  })

  const inputValueRef = ref(props.defaultValue)

  const modalClass = computed(() => {
    return `type-${props.type}`
  })

  const handleConfirm = async () => {
    await props.onConfirm?.(props.showInput ? inputValueRef.value : undefined)
  }
</script>

<template>
  <ModalBase
    :visible="visible"
    :classNames="{ root: modalClass, content: 'nm-content' }"
    :title="title"
    :showCancel="showCancel"
    :showClose="showClose"
    :cancelText="cancelText"
    :confirmText="confirmText"
    :autoFocus="autoFocus"
    :maskClosable="maskClosable"
    :onClose="onClose"
    :onConfirm="handleConfirm"
    :onCancel="onCancel"
  >
    <!-- 图标 -->
    <div v-if="typeof icon === 'string'" class="modal-icon">
      {{ icon }}
    </div>
    <div v-else-if="icon" class="modal-icon">
      <component :is="icon" />
    </div>

    <!-- 消息内容 -->
    <div v-if="typeof content === 'string' && content" class="modal-message">
      {{ content }}
    </div>
    <div v-else-if="content" class="modal-message">
      <component :is="content" />
    </div>

    <!-- 输入框 -->
    <div v-if="showInput" class="modal-input">
      <input v-model="inputValueRef" :type="inputType" :placeholder="inputPlaceholder" class="modal-input-field" @keyup.enter="handleConfirm" />
    </div>
  </ModalBase>
</template>

<style lang="scss">
  .nm-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    width: 300px;

    .modal-icon {
      // width: 60px;
      // height: 60px;
      // border-radius: 50%;
      // background: var(--modal-icon-color, #0066cc);
      // color: white;
      // display: flex;
      // align-items: center;
      // justify-content: center;
      // font-size: 30px;
      // flex-shrink: 0;
    }

    .modal-message {
      width: 100%;
      font-size: 15px;
      line-height: 1.5;
      color: var(--text-color-primary);
    }

    .modal-input {
      width: 100%;

      .modal-input-field {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid var(--text-color-secondary);
        border-radius: 6px;
        font-size: 14px;
        color: var(--text-color-primary);
        transition: border-color 0.2s;

        &:focus {
          border-color: var(--btn-primary-bg);
        }

        &::placeholder {
          color: var(--text-color-primary);
          opacity: 0.6;
        }
      }
    }
  }
</style>
