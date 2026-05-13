<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import IconBase from '../base/IconBase.vue'
  import { IconEnum } from '@metatune/common'
  import { Modal } from '@/utils/modal'

  // const updateStatusRef = ref<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle')
  const appInfoRef = ref<{ name: string; version: string; platform: string }>()
  const checkingRef = ref(false)
  let cancelCall: () => void

  const onGit = () => {
    window.open('https://github.com/gzj666-scy/metatune-player', '_blank')
  }

  const onUpdate = () => {
    try {
      window.electronAPI.send('update:check', { auto: false })
      checkingRef.value = true
    } catch (error) {
      checkingRef.value = false
    }
  }

  onMounted(async () => {
    cancelCall = window.electronAPI.on('update-status', (data: any) => {
      // updateStatusRef.value = data.status
      if (data.status === 'not-available') {
        checkingRef.value = false
        Modal.alert('当前已是最新版本')
      }
    })
    try {
      appInfoRef.value = await window.electronAPI?.getAppInfo()
    } catch (e) {
      console.error('Failed to get version:', e)
    }
  })

  onUnmounted(() => {
    cancelCall && cancelCall()
  })
</script>

<template>
  <div class="about-view">
    <div class="about-view-top">
      <div class="player-logo"></div>
      <div class="player-info">
        <div>元音播放器</div>
        <p>v{{ appInfoRef?.version || '--' }}</p>
      </div>

      <p class="text-gray-600 dark:text-gray-300 max-w-sm">一个现代化的本地音乐播放器</p>
    </div>

    <div class="about-view-btns">
      <div class="about-btn" @click="onGit">
        <IconBase>
          <component :is="IconEnum.GitHub" />
        </IconBase>
        GitHub 仓库
      </div>
      <div class="about-btn update" @click="onUpdate">
        <IconBase :class="{ rotate: checkingRef }">
          <component :is="checkingRef ? IconEnum.RefreshCw : IconEnum.ArrowBigUpDash" />
        </IconBase>
        检查更新
      </div>
    </div>

    <div class="copyright-txt">© 2026 MetatunePlayer Developer. All Rights Reserved.</div>
  </div>
</template>

<style scoped lang="scss">
  .about-view {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 40px;

    .about-view-top {
      margin-top: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;

      .player-logo {
        width: 100px;
        height: 100px;
        flex-shrink: 0;
        background: url(../../assets/logo.png) no-repeat;
        background-size: contain;
      }

      .player-info {
        text-align: center;
        display: flex;
        flex-direction: column;

        div {
          font-size: 30px;
          font-weight: 500;
          line-height: 150%;
        }
      }
    }

    .about-view-btns {
      display: flex;
      justify-content: center;
      gap: 20px;

      .about-btn {
        width: 150px;
        height: 40px;
        font-size: 14px;
        border-radius: 8px;
        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.26);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        transition: all 0.2s;

        svg {
          width: 16px;
        }

        &:hover {
          filter: brightness(1.2);
        }

        &.update {
          background: var(--btn-primary-bg);
          color: var(--btn-primary-text);

          .rotate {
            animation: update-rotate 1s linear infinite;
          }
        }

        @keyframes update-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      }
    }

    .copyright-txt {
      text-align: center;
    }
  }
</style>
