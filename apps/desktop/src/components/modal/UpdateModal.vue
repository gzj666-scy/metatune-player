<script setup lang="ts">
  import { ref, onMounted, computed, onUnmounted } from 'vue'
  import ModalBase from '../base/ModalBase.vue'

  const updateStatusRef = ref<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle')
  const progressRef = ref(0)
  const newVersionRef = ref('')
  const releaseNotesRef = ref('')
  const isAutoRef = ref(true)
  const waitingRef = ref(false)
  let cancelStatus: (() => void) | undefined
  let cancelProgress: (() => void) | undefined

  const show = computed(() => {
    if (isAutoRef.value && updateStatusRef.value === 'error') return false
    return ['available', 'downloading', 'downloaded', 'error'].includes(updateStatusRef.value)
  })
  const confirmText = computed(() => {
    if (updateStatusRef.value === 'downloading') return `下载中 ${progressRef.value}%`
    if (updateStatusRef.value === 'downloaded') return '立即安装并重启'
    if (updateStatusRef.value === 'error') return '确定'
    return '立即下载'
  })

  function handleClose() {
    updateStatusRef.value = 'idle'
  }

  function handleUpdate() {
    if (updateStatusRef.value === 'downloading' || updateStatusRef.value === 'checking') return
    if (updateStatusRef.value === 'downloaded') {
      waitingRef.value = true
      window.electronAPI.installUpdate()
      return
    }
    if (updateStatusRef.value === 'error') {
      handleClose()
      return
    }
    waitingRef.value = true
    window.electronAPI.downloadUpdate()
  }

  onMounted(() => {
    // v3：更新事件改用类型化订阅（移除原版通用 send/on 通道）
    cancelStatus = window.electronAPI.onUpdateStatus(data => {
      updateStatusRef.value = data.status as typeof updateStatusRef.value
      isAutoRef.value = data.auto
      if (data.version) newVersionRef.value = data.version
      if (data.status === 'downloaded') {
        waitingRef.value = false
      }
    })

    cancelProgress = window.electronAPI.onUpdateProgress(data => {
      progressRef.value = Math.round(data.percent)
      updateStatusRef.value = 'downloading'
    })

    // 启动时自动检查
    window.electronAPI.checkUpdate(true)
  })

  onUnmounted(() => {
    cancelStatus?.()
    cancelProgress?.()
  })
</script>

<template>
  <Teleport to="body">
    <ModalBase
      :visible="show"
      :classNames="{ content: 'udm-content' }"
      title="更新检查"
      :onClose="handleClose"
      :onConfirm="handleUpdate"
      :showCancel="false"
      :confirmText="confirmText"
      :loading="waitingRef"
    >
      <div v-if="updateStatusRef === 'available' || updateStatusRef === 'downloading'" class="update-dialog">
        <div>发现新版本 v{{ newVersionRef }}</div>
        <div v-if="releaseNotesRef" v-html="releaseNotesRef"></div>
      </div>

      <div v-if="updateStatusRef === 'downloaded'" class="update-dialog">
        <div>下载完成</div>
      </div>
      <div v-if="updateStatusRef === 'error'" class="update-dialog">
        <div>更新错误，请稍后重试</div>
      </div>
    </ModalBase>
  </Teleport>
</template>

<style lang="scss">
  .udm-content {
    min-width: 300px;
    max-width: 400px;

    .update-dialog {
      font-size: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
  }
</style>
