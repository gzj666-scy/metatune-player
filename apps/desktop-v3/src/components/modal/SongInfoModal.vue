<script setup lang="ts">
  import { formatFileSize } from '@metatune/common-v3'
  import type { IModalProps } from '@metatune/common-v3'
  import { computed } from 'vue'
  import ModalBase from '../base/ModalBase.vue'
  import { getStoreManager } from '@/utils/storeManager'

  const props = withDefaults(defineProps<IModalProps<{ songId: string }>>(), {
    type: '',
  })

  const storeManager = getStoreManager()
  const { playerStore } = storeManager

  const song = computed(() => {
    if (!props.data?.songId) return undefined
    return playerStore.songMap.get(props.data.songId) ?? undefined
  })

  // 保留两位小数；缺失(undefined/NaN)显示 --
  const fmt2 = (v: number | undefined): string => (v === undefined || Number.isNaN(v) ? '--' : v.toFixed(2))

  function onClose() {
    props.closeCallBack?.()
    playerStore.modal = { type: '', data: null }
  }
</script>

<template>
  <Teleport to="body">
    <ModalBase :visible="true" :classNames="{ content: 'sim-content' }" title="音频信息" :onClose="onClose" :showFooter="false">
      <div class="sim-item">
        <span class="sim-item-label">名字</span>
        <span>{{ song?.title }}</span>
      </div>
      <div class="sim-item">
        <span class="sim-item-label">艺人</span>
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
        <span class="sim-item-label">编码</span>
        <span>{{ song?.codec }}</span>
      </div>
      <div class="sim-item">
        <span class="sim-item-label">响度归一化</span>
        <span>{{ fmt2(song?.lufs) }} / {{ fmt2(song?.truePeak) }} / {{ fmt2(song?.gain) }}</span>
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
