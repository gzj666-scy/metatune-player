<script setup lang="ts">
  import { getStoreManager } from '@/utils/storeManager'
  import { PanelEnum } from '@metatune/common/utils'
  import { computed, markRaw } from 'vue'
  import PlaylistActionPanel from './PlaylistActionPanel.vue'
  import SongActionPanel from './SongActionPanel.vue'
  import SortModePanel from './SortModePanel.vue'

  const storeManager = getStoreManager()
  const { playerStore } = storeManager

  const panel = computed(() => playerStore.panel)
  const currentPanelComponent = computed(() => {
    const components = {
      [PanelEnum.PlaylistAction]: markRaw(PlaylistActionPanel),
      [PanelEnum.SongAction]: markRaw(SongActionPanel),
      [PanelEnum.SortMode]: markRaw(SortModePanel),
    }
    return components[panel.value.type as PanelEnum] || null
  })
</script>

<template>
  <component :is="currentPanelComponent" :key="panel.type" v-bind="panel" />
</template>
