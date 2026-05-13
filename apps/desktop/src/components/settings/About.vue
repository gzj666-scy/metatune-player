<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import IconBase from '../base/IconBase.vue'

  const appInfoRef = ref<{ name: string; version: string; platform: string }>()

  const onGit = () => {
    window.open('https://github.com/gzj666-scy/metatune-player', '_blank')
  }

  const onUpdate = () => {
    window.electronAPI.send('update:check', { auto: false })
  }

  onMounted(async () => {
    try {
      appInfoRef.value = await window.electronAPI?.getAppInfo()
    } catch (e) {
      console.error('Failed to get version:', e)
    }
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
      <div href="https://github.com/Billy636/LyciaMusic" target="_blank" class="about-btn" @click="onGit">
        <IconBase>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"
            />
          </svg>
        </IconBase>
        GitHub 仓库
      </div>
      <div href="https://github.com/Billy636/LyciaMusic/releases" target="_blank" class="about-btn update" @click="onUpdate">
        <IconBase>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 19h6"></path>
            <path d="M9 15v-3H5l7-7 7 7h-4v3H9z"></path>
          </svg>
        </IconBase>
        检查更新
      </div>
    </div>

    <!-- Copyright -->
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
        }
      }
    }

    .copyright-txt {
      text-align: center;
    }
  }
</style>
