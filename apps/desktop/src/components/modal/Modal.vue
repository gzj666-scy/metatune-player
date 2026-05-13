<template>
  <component :is="currentModalComponent" :key="modal.type" v-bind="modal" />
</template>

<script setup lang="ts">
  import { getStoreManager } from '@/utils/storeManager'
  import { ModalType } from '@metatune/common'
  import { computed, markRaw } from 'vue'
  import AddToPlaylistModal from './AddToPlaylistModal.vue'
  import SongInfoModal from './SongInfoModal.vue'

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const modal = computed(() => playerStore.modal)
  const currentModalComponent = computed(() => {
    const components = {
      [ModalType.AddToPlaylist]: markRaw(AddToPlaylistModal),
      [ModalType.SongInfo]: markRaw(SongInfoModal),
    }
    return components[modal.value.type as ModalType] || null
  })
</script>
