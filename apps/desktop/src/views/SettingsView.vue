<script setup lang="ts">
  import { ref, computed, markRaw } from 'vue'
  import { getStoreManager } from '@/utils/storeManager'
  import About from '@/components/settings/About.vue'

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const tabs = [
    { id: 'general', name: '常规' },
    // { id: 'theme', name: '外观' },
    // { id: 'toolbox', name: '工具箱' },
    // { id: 'library', name: '音乐库' }, // Added tab
    // { id: 'shortcuts', name: '快捷键' },
    { id: 'about', name: '关于' },
  ]

  const activeTabRef = ref<(typeof tabs)[number]['id']>('general')

  const currentTabComponent = computed(() => {
    const components = {
      general: markRaw(About),
      about: markRaw(About),
    }
    return components[activeTabRef.value as keyof typeof components] || null
  })

  const onTabs = (data: (typeof tabs)[number]['id']) => {
    activeTabRef.value = data
  }
</script>

<template>
  <div class="settings-view">
    <div class="settings-tab">
      <div v-for="tab in tabs" :key="tab.id" @click="onTabs(tab.id)" class="tab-item" :class="{ active: activeTabRef === tab.id }">
        {{ tab.name }}
      </div>
    </div>
    <div class="settings-content">
      <component :is="currentTabComponent" :key="activeTabRef" />
    </div>
  </div>
</template>

<style scoped lang="scss">
  .settings-view {
    height: 100%;
    display: flex;

    .settings-tab {
      width: 140px;
      display: flex;
      flex-direction: column;

      .tab-item {
        transition: all 0.2s;
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 14px;
        color: var(--text-color-primary);
        display: flex;
        align-items: center;

        &:hover {
          background: rgba(0, 102, 204, 0.05);
        }

        &.active {
          background: rgba(0, 102, 204, 0.15);
          color: var(--active-text-color-primary);
        }
      }
    }

    .settings-content {
      flex-grow: 1;
      width: 100%;
      min-height: 0;
      padding: 0 10px 0 20px;
      overflow: auto;
    }
  }
</style>
