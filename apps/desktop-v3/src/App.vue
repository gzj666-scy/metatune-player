<script setup lang="ts">
  import { ref, onMounted, provide, computed } from 'vue'
  import { getPlayManager } from '@/utils/playManager'
  import { getStoreManager } from '@/utils/storeManager'
  import TitleBar from '@/components/layout/TitleBar.vue'
  import Sidebar from '@/components/layout/Sidebar.vue'
  import PlayerStatusBar from '@/components/business/PlayerStatusBar.vue'
  import PlayerView from '@/views/PlayerView.vue'
  import PanelCollection from '@/components/panel/PanelCollection.vue'
  import ModalCollection from '@/components/modal/ModalCollection.vue'
  import UpdateModal from '@/components/modal/UpdateModal.vue'

  const playManager = getPlayManager()
  const storeManager = getStoreManager()
  const { playerStore } = storeManager

  const showPlayerViewRef = ref(false)

  const song = computed(() => playerStore.currentSong)
  const settings = computed(() => playerStore.settings)

  function onTogglePlayerView(data: boolean) {
    if (!song.value) return
    showPlayerViewRef.value = data
  }

  // 播放控制方法
  function handlePlaySong(songId: string, listKey: string) {
    playManager.playSong(songId, 0, listKey)
    if (settings.value.autoOpenPlayView) {
      onTogglePlayerView(true)
    }
  }
  function togglePlayPause(listKey: string) {
    playManager.togglePlayPause(listKey)
  }
  function seekTo(time: number) {
    playManager.seekTo(time)
  }
  provide('play-song', handlePlaySong)
  provide('toggle-play', togglePlayPause)

  onMounted(async () => {
    const [meta, player] = await Promise.all([window.electronAPI.getSongsCache(), window.electronAPI.getPlayerCache()])
    console.log('加载持久化数据', meta, player)
    storeManager.initData(meta, player)

    // 处理一些设置
    if (player?.settings.setupResume) {
      if (player?.state?.currentTime) seekTo(player.state.currentTime)
      if (player?.state?.volume) playManager.setVolume(player.state.volume)
      if (player?.state?.isMuted) playManager.toggleMute(player.state.isMuted)
    }

    // v3：退出保存改由主进程 before-quit 主动通知（原版依赖 beforeunload 在 app.quit 时不可靠）
    window.electronAPI.onFlushRequest(() => {
      try {
        storeManager.savePlayCacheNow()
        playManager.destroy()
      } catch (error) {
        console.error('退出保存失败:', error)
      }
    })
  })
</script>

<template>
  <div id="desktop">
    <!-- 自定义标题栏 -->
    <TitleBar />
    <!-- 主界面 -->
    <div class="main-container">
      <!-- 侧边栏 -->
      <Sidebar />
      <!-- 主内容区 -->
      <main class="main-content">
        <!-- 路由视图 -->
        <div class="view-container">
          <!-- <router-view :key="$route.fullPath" /> -->

          <router-view v-slot="{ Component }" :key="$route.fullPath">
            <KeepAlive>
              <component :is="Component" />
            </KeepAlive>
          </router-view>
        </div>
      </main>
    </div>
    <!-- 播放状态栏 (常驻底部) -->
    <PlayerStatusBar @toggle-player="onTogglePlayerView" />
    <!-- 播放器界面 -->
    <PlayerView :show="showPlayerViewRef" @toggle-player="onTogglePlayerView" />
    <PanelCollection />
    <ModalCollection />
    <UpdateModal />
  </div>
</template>

<style scoped lang="scss">
  #desktop {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;

    .main-container {
      flex: 1;
      min-height: 0;
      padding: 10px;
      display: flex;
      flex-direction: row;
      overflow: hidden;

      .main-content {
        flex: 1;
        min-height: 0;
        padding-left: 20px;

        .view-container {
          width: 100%;
          height: 100%;
        }
      }
    }
  }
</style>
