<script setup lang="ts">
  import { ref } from 'vue'
  import IconBase from '../base/IconBase.vue'
  import { DefaultKey, IconEnum } from '@metatune/common'
  import { useRouter } from 'vue-router'
  import { getStoreManager } from '@/utils/storeManager'

  const router = useRouter()

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const isMaximized = ref(false)

  const onSettings = () => {
    router.replace('/settings')
    playerStore.currentViewKey = DefaultKey.Settings
  }

  const onMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow()
    }
  }

  const onMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow()
      isMaximized.value = !isMaximized.value
    }
  }

  const onClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow()
    }
  }
</script>

<template>
  <div class="titlebar">
    <div class="titlebar-drag">
      <div class="player-logo"></div>
      <span class="player-name">元音播放器</span>
    </div>
    <div class="titlebar-controls">
      <button class="titlebar-button settings" @click="onSettings" title="设置">
        <IconBase class="menu-icon">
          <component :is="IconEnum.Settings" />
        </IconBase>
      </button>
      <button class="titlebar-button" @click="onMinimize" title="最小化">
        <svg width="12" height="1">
          <line x1="0" y1="0.5" x2="12" y2="0.5" stroke="currentColor" />
        </svg>
      </button>
      <button class="titlebar-button" @click="onMaximize" title="最大化">
        <svg width="10" height="10">
          <rect v-if="!isMaximized" width="9" height="9" fill="none" stroke="currentColor" />
          <rect v-else width="8" height="8" x="1" y="1" fill="none" stroke="currentColor" />
        </svg>
      </button>
      <button class="titlebar-button close" @click="onClose" title="关闭">
        <svg width="12" height="12">
          <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" />
          <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .titlebar {
    height: 32px;
    background: rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    -webkit-app-region: drag;
    user-select: none;

    .titlebar-drag {
      flex: 1;
      height: 100%;
      -webkit-app-region: drag;
      display: flex;
      align-items: center;
      gap: 10px;

      .player-logo {
        margin-left: 10px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        background: url(../../assets/logo.png) no-repeat;
        background-size: contain;
      }

      .player-name {
        font-size: 14px;
        color: var(--text-color-primary);
      }
    }

    .titlebar-controls {
      display: flex;
      -webkit-app-region: no-drag;

      .titlebar-button {
        width: 46px;
        height: 32px;
        background: transparent;
        border: none;
        color: var(--text-color-primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        &.close:hover {
          background: #e81123c7;
        }

        &.settings {
          svg {
            width: 16px;
          }
        }
      }
    }
  }
</style>
