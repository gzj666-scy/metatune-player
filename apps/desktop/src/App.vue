<script setup lang="ts">
  import { ref, onMounted, onUnmounted, provide, computed } from 'vue'
  import { getPlayManager } from '@/utils/playManager'
  import { getStoreManager } from '@/utils/storeManager'
  import TitleBar from '@/components/layout/TitleBar.vue'
  import Sidebar from '@/components/layout/Sidebar.vue'
  import PlayerStatusBar from '@/components/business/PlayerStatusBar.vue'
  import PlayerView from '@/views/PlayerView.vue'
  import Panel from '@/components/panel/Panel.vue'
  import Modal from '@/components/modal/Modal.vue'
  import UpdateModal from '@/components/modal/UpdateModal.vue'

  const playManager = getPlayManager()
  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const showPlayerViewRef = ref(false)

  const song = computed(() => playerStore.currentSong)
  const settings = computed(() => playerStore.settings)

  const onTogglePlayerView = (data: boolean) => {
    if (!song.value) return
    showPlayerViewRef.value = data
  }

  // 播放控制方法
  const handlePlaySong = (songId: string, listKey: string) => {
    playManager.playSong(songId, 0, listKey)
    if (settings.value.autoOpenPlayView) {
      onTogglePlayerView(true)
    }
  }
  const togglePlayPause = (listKey: string) => {
    playManager.togglePlayPause(listKey)
  }
  const seekTo = (time: number) => {
    playManager.seekTo(time)
  }
  provide('play-song', handlePlaySong)
  provide('toggle-play', togglePlayPause)

  const handleBeforeUnload = () => {
    playManager.destroy()
    storeManager.savePlayCache()
  }

  onMounted(async () => {
    const [meta, player] = await Promise.all([window.electronAPI.getLocalListCache(), window.electronAPI.getPlayerCache()])
    console.log('加载持久化数据', meta, player)
    storeManager.initData(meta, player)

    // 处理一些设置
    if (player?.settings.setupResume) {
      if (player?.state?.currentTime) seekTo(player.state.currentTime)
      if (player?.state?.volume) playManager.setVolume(player.state.volume)
      if (player?.state?.isMuted) playManager.toggleMute(player.state.isMuted)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  // 应用卸载时保存数据
  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
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
    <Panel />
    <Modal />
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
