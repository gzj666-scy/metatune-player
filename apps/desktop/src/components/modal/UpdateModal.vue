<script setup lang="ts">
  import { ref, onMounted, computed, onUnmounted } from 'vue'
  import ModalBase from '../base/ModalBase.vue'

  const updateStatusRef = ref<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle')
  const progressRef = ref(0)
  const newVersionRef = ref('')
  const releaseNotesRef = ref('')
  const isAutoRef = ref(true)
  const waitingRef = ref(false)
  let cancelCall1: () => void
  let cancelCall2: () => void

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

  const onClose = () => {
    updateStatusRef.value = 'idle'
  }

  const onUpdate = () => {
    if (updateStatusRef.value === 'downloading' || updateStatusRef.value === 'checking') return
    if (updateStatusRef.value === 'downloaded') {
      waitingRef.value = true
      window.electronAPI.send('update:install')
      return
    }
    if (updateStatusRef.value === 'error') {
      // window.electronAPI.send('update:check', { auto: false })
      onClose()
      return
    }
    waitingRef.value = true
    window.electronAPI.send('update:download')
  }

  onMounted(() => {
    // 监听主进程事件
    cancelCall1 = window.electronAPI.on('update-status', (data: any) => {
      updateStatusRef.value = data.status
      isAutoRef.value = data.auto
      if (data.version) newVersionRef.value = data.version
      if (data.releaseNotesRef) releaseNotesRef.value = data.releaseNotesRef
      if (data.status === 'downloaded') {
        waitingRef.value = false
      }
    })

    cancelCall2 = window.electronAPI.on('update-progress', (data: any) => {
      progressRef.value = Math.round(data.percent)
      updateStatusRef.value = 'downloading'
    })

    // 启动时自动检查
    window.electronAPI.send('update:check', { auto: true })
  })

  onUnmounted(() => {
    cancelCall1 && cancelCall1()
    cancelCall2 && cancelCall2()
  })
</script>

<template>
  <Teleport to="body">
    <ModalBase
      :visible="show"
      :classNames="{ content: 'udm-content' }"
      title="更新检查"
      :onClose="onClose"
      :onConfirm="onUpdate"
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
