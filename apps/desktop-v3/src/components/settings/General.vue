<script setup lang="ts">
  import { computed } from 'vue'
  import Switch from '../base/Switch.vue'
  import { getStoreManager } from '@/utils/storeManager'
  import { Modal } from '@/utils/modal'
  import { getPlayManager } from '@/utils/playManager'

  const playManager = getPlayManager()
  const storeManager = getStoreManager()
  const { playerStore } = storeManager

  const settings = computed(() => playerStore.settings)

  function handleSetupResume(data: boolean) {
    playerStore.settings.setupResume = data
  }

  function handleCloseExist(data: boolean) {
    playerStore.settings.closeQuit = !data
  }

  function handleAutoOpenPlayView(data: boolean) {
    playerStore.settings.autoOpenPlayView = data
  }

  function handleOpenVisualization(data: boolean) {
    playerStore.settings.openVisualization = data
  }

  async function handleClear() {
    const result = await Modal.confirm('清理数据（未使用的专辑图、无效的歌曲等）', '确认清理')
    if (result) {
      storeManager.clearInvalidSongs()
      storeManager.clearInvalidAlbumArt()
    }
  }

  async function handleReset() {
    const result = await Modal.confirm('清理所有数据（导入的歌曲、收藏、歌单、设置等），将播放器重置到初始状态', '确认重置')
    if (result) {
      const player = playManager.getPlayer()
      player.stop()
      storeManager.resetStore()
      player.reset()
      window.electronAPI?.resetAllCache()
    }
  }
</script>

<template>
  <section class="general-view">
    <div class="general-group">
      <h2 class="general-group-title">启停：</h2>
      <div class="general-item-group">
        <div class="general-item">
          <div class="general-item-info">
            <div class="general-item-title">启动时恢复上次播放</div>
          </div>
          <Switch :checked="settings.setupResume" @change="handleSetupResume" />
        </div>
        <div class="general-item">
          <div class="general-item-info">
            <div class="general-item-title">关闭主窗口时最小化到托盘，不退出程序</div>
          </div>
          <Switch :checked="!settings.closeQuit" @change="handleCloseExist" />
        </div>
      </div>
    </div>

    <div class="general-group">
      <h2 class="general-group-title">播放：</h2>
      <div class="general-item-group">
        <div class="general-item">
          <div class="general-item-info">
            <div class="general-item-title">播放时自动拉起播放页</div>
          </div>
          <Switch :checked="settings.autoOpenPlayView" @change="handleAutoOpenPlayView" />
        </div>
        <div class="general-item">
          <div class="general-item-info">
            <div class="general-item-title">开启播放页频谱动效</div>
          </div>
          <Switch :checked="settings.openVisualization" @change="handleOpenVisualization" />
        </div>
      </div>
    </div>

    <div class="general-group">
      <h2 class="general-group-title">缓存：</h2>
      <div class="general-item-group">
        <div class="general-item">
          <div class="general-item-info">
            <div class="general-item-title">清理缓存</div>
          </div>
          <button class="general-item-btn" @click="handleClear">清理</button>
        </div>
        <div class="general-item">
          <div class="general-item-info">
            <div class="general-item-title">重置数据</div>
          </div>
          <button class="general-item-btn" @click="handleReset">重置</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
  .general-view {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;

    .general-group {
      .general-group-title {
        font-size: 16px;
        line-height: 200%;
        font-weight: 600;
      }

      .general-item-group {
        .general-item {
          display: flex;
          justify-content: space-between;
          padding: 8px;

          .general-item-info {
            .general-item-title {
              font-size: 14px;
            }
          }

          .scy-switch {
            width: 46px;
            height: 22px;
            border-radius: 30px;
            padding: 2px;

            :deep(.scy-switch-bar) {
              width: 18px;
              height: 18px;
            }
          }

          .general-item-desc {
            margin-top: 4px;
            font-size: 12px;
            line-height: 1.4;
            color: var(--text-color-secondary, rgb(0 0 0 / 60%));
          }

          .general-item-input {
            width: 72px;
            height: 28px;
            padding: 0 8px;
            border-radius: 6px;
            border: 1px solid var(--border-color, rgb(0 0 0 / 15%));
            background: var(--input-bg, rgb(0 0 0 / 4%));
            color: var(--text-color-primary);
            font-size: 13px;
            text-align: center;

            &:focus {
              outline: none;
              border-color: var(--btn-primary-bg);
            }
          }

          .general-item-btn {
            width: 70px;
            height: 30px;
            border-radius: 50px;
            background: var(--btn-secondary-bg);
            color: var(--btn-primary-bg);

            &:hover {
              color: var(--btn-primary-hover-bg);
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }
    }
  }
</style>
