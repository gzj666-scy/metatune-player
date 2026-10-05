<script setup lang="ts">
  import { computed } from 'vue'
  import IconBase from '../base/IconBase.vue'
  import { DefaultKey, IconEnum } from '@metatune/common'
  import { useRouter } from 'vue-router'
  import { getStoreManager } from '@/utils/storeManager'

  interface Props {
    inPlayer?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    inPlayer: false,
  })

  const emit = defineEmits<{
    'toggle-player': [data: boolean]
  }>()

  const router = useRouter()
  const storeManager = getStoreManager()
  const { playerStore } = storeManager

  const settings = computed(() => playerStore.settings)
  const isMaximized = computed(() => playerStore.business.isMaximized)

  function onSettings() {
    router.replace('/settings')
    playerStore.currentViewKey = DefaultKey.Settings
  }

  function onMinimize() {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow()
    }
  }

  function onMaximize() {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow()
      playerStore.business.isMaximized = !playerStore.business.isMaximized
    }
  }

  function onClose() {
    if (window.electronAPI) {
      window.electronAPI.closeWindow(settings.value.closeQuit)
    }
  }
</script>

<template>
  <div class="titlebar" :class="{ 'in-player': props.inPlayer }">
    <div class="titlebar-left">
      <div v-if="!props.inPlayer" class="player-logo-box">
        <div class="player-logo"></div>
        <span class="player-name">元音播放器</span>
      </div>
      <button v-if="props.inPlayer" class="titlebar-button" @click="$emit('toggle-player', false)" title="收起播放详情">
        <IconBase>
          <component :is="IconEnum.ChevronsDown" />
        </IconBase>
      </button>
    </div>
    <div class="titlebar-right">
      <button v-if="!props.inPlayer" class="titlebar-button" @click="onSettings" title="设置">
        <IconBase class="menu-icon">
          <component :is="IconEnum.Settings" />
        </IconBase>
      </button>
      <button class="titlebar-button" @click="onMinimize" title="最小化">
        <IconBase>
          <component :is="IconEnum.Minus" />
        </IconBase>
      </button>
      <button class="titlebar-button" @click="onMaximize" :title="isMaximized ? '还原' : '最大化'">
        <IconBase>
          <component :is="isMaximized ? IconEnum.Minimize : IconEnum.Maximize" />
        </IconBase>
      </button>
      <button class="titlebar-button close" @click="onClose" title="关闭">
        <IconBase>
          <component :is="IconEnum.Close" />
        </IconBase>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .titlebar {
    width: 100%;
    height: 45px;
    padding: 0 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    -webkit-app-region: drag;
    --titlebar-btn-color: var(--text-color-primary);

    &.in-player {
      .titlebar-button {
        &:hover {
          background: none;

          svg {
            filter: brightness(1.3);
          }
        }

        &.close:hover {
          background: none;
          color: var(--titlebar-btn-color);

          svg {
            filter: brightness(1.3);
          }
        }

        svg {
          width: 18px;
        }
      }
    }

    .titlebar-left {
      display: flex;
      align-items: center;
      gap: 5px;
      -webkit-app-region: no-drag;

      .player-logo-box {
        display: flex;
        align-items: center;
        gap: 10px;

        .player-logo {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          background: url(../../assets/logo.png) no-repeat;
          background-size: contain;
          margin-left: 5px;
        }

        .player-name {
          font-size: 14px;
          color: var(--text-color-primary);
        }
      }
    }

    .titlebar-right {
      display: flex;
      align-items: center;
      gap: 5px;
      -webkit-app-region: no-drag;
    }

    .titlebar-button {
      width: 30px;
      height: 30px;
      border-radius: 4px;
      color: var(--titlebar-btn-color);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      &.close:hover {
        background: #e81123c7;
        color: var(--btn-primary-text);
      }

      svg {
        width: 16px;
      }
    }
  }
</style>
