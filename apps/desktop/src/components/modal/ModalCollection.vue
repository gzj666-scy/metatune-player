<script setup lang="ts">
  import { getStoreManager } from '@/utils/storeManager'
  import { ModalEnum } from '@metatune/common/utils'
  import { computed, markRaw } from 'vue'
  import AddToPlaylistModal from './AddToPlaylistModal.vue'
  import SongInfoModal from './SongInfoModal.vue'

  const storeManager = getStoreManager()
  const { playerStore } = storeManager

  const modal = computed(() => playerStore.modal)
  const currentModalComponent = computed(() => {
    const components = {
      [ModalEnum.AddToPlaylist]: markRaw(AddToPlaylistModal),
      [ModalEnum.SongInfo]: markRaw(SongInfoModal),
    }
    return components[modal.value.type as ModalEnum] || null
  })
</script>

<template>
  <component :is="currentModalComponent" :key="modal.type" v-bind="modal" />
</template>
