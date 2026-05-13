<template>
  <component :is="currentPanelComponent" :key="panel.type" v-bind="panel" />
</template>

<script setup lang="ts">
  import { getStoreManager } from '@/utils/storeManager'
  import { PanelType } from '@metatune/common'
  import { computed, markRaw } from 'vue'
  import PlaylistActionPanel from './PlaylistActionPanel.vue'
  import SongActionPanel from './SongActionPanel.vue'
  import SortModePanel from './SortModePanel.vue'

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const panel = computed(() => playerStore.panel)
  const currentPanelComponent = computed(() => {
    const components = {
      [PanelType.PlaylistAction]: markRaw(PlaylistActionPanel),
      [PanelType.SongAction]: markRaw(SongActionPanel),
      [PanelType.SortMode]: markRaw(SortModePanel),
    }
    return components[panel.value.type as PanelType] || null
  })
</script>
