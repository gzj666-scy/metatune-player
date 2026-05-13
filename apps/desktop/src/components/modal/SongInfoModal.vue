<script setup lang="ts">
  import { formatFileSize } from '@metatune/common'
  import type { IModalProps, ISong } from '@metatune/common'
  import { computed, Teleport } from 'vue'
  import ModalBase from '../base/ModalBase.vue'
  import { getStoreManager } from '@/utils/storeManager'

  const props = withDefaults(defineProps<IModalProps<{ song: ISong }>>(), {
    type: '',
  })

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const song = computed(() => props.data?.song)

  const onClose = () => {
    props.closeCallBack?.()
    playerStore.modal = { type: '', data: null }
  }
</script>

<template>
  <Teleport to="body">
    <ModalBase :visible="true" :classNames="{ content: 'sim-content' }" title="歌曲信息" :onClose="onClose" :showFooter="false">
      <div class="sim-item">
        <span class="sim-item-label">歌名</span>
        <span>{{ song?.title }}</span>
      </div>
      <div class="sim-item">
        <span class="sim-item-label">歌手</span>
        <span>{{ song?.artist }}</span>
      </div>
      <div class="sim-item">
        <span class="sim-item-label">专辑</span>
        <span>{{ song?.album }}</span>
      </div>
      <div class="sim-item">
        <span class="sim-item-label">大小</span>
        <span>{{ formatFileSize(song?.size || 0) }}</span>
      </div>
      <div class="sim-item">
        <span class="sim-item-label">路径</span>
        <span>{{ song?.filePath }}</span>
      </div>
    </ModalBase>
  </Teleport>
</template>

<style lang="scss">
  .sim-content {
    min-width: 300px;
    max-width: 400px;
    display: flex;
    flex-direction: column;

    .sim-item {
      padding: 6px 6px;
      font-size: 14px;
      display: flex;
      gap: 10px;

      .sim-item-label {
        flex-shrink: 0;
      }
    }
  }
</style>
