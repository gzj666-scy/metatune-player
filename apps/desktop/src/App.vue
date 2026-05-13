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
          <!-- <router-view :key="$route.meta.key + ''" /> -->
          <router-view :key="$route.fullPath" />
          <!-- <KeepAlive>
            <router-view />
          </KeepAlive> -->

          <!-- <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view> -->
        </div>
      </main>
    </div>
    <!-- 播放状态栏 (常驻底部) -->
    <PlayerStatusBar @open-player="onOpenPlayerView" />
    <!-- 播放器界面 -->
    <PlayerView :show="showPlayerViewRef" @close="showPlayerViewRef = false" />
    <Panel />
    <Modal />
    <UpdateModal />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted, provide } from 'vue'
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

  // 打开播放器界面
  const onOpenPlayerView = () => {
    showPlayerViewRef.value = true
  }

  // 播放控制方法
  const handlePlaySong = (songId: string, listKey: string) => {
    playManager.playSong(songId, 0, listKey)
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
    // 监听键盘快捷键
    //   setupKeyboardShortcuts();

    const [meta, player] = await Promise.all([window.electronAPI.getLocalListCache(), window.electronAPI.getPlayerCache()])
    console.log('加载持久化数据', meta, player)
    storeManager.initData(meta, player)
    if (player?.state?.currentTime) seekTo(player.state.currentTime)
    if (player?.state?.volume) playManager.setVolume(player.state.volume)
    if (player?.state?.isMuted) playManager.toggleMute(player.state.isMuted)
    window.addEventListener('beforeunload', handleBeforeUnload)
    // if (data.playlists.length > 0) {
    //     playerStore.playlists = data.playlists;
    // }
    // if (data.playbackState) {
    //     Object.assign(playerStore.currentState, data.playbackState);
    // }
    // if (data.settings) {
    //     Object.assign(playerStore.settings, data.settings);
    // }

    // // 设置音频播放器事件监听
    // audioPlayer.onTimeUpdate((time) => {
    //     currentTime.value = time;
    //     playerStore.setCurrentTime(time);
    // });

    // audioPlayer.onEnd(() => {
    //     playerStore.nextSong();
    //     if (playerStore.currentSong) {
    //         audioPlayer.play(playerStore.currentSong);
    //     }
    // });

    // audioPlayer.onPlay(() => {
    //     playerStore.currentState.isPlaying = true;
    // });

    // audioPlayer.onPause(() => {
    //     playerStore.currentState.isPlaying = false;
    // });

    // 监听窗口状态
    // if (window.electronAPI) {
    //     window.electronAPI.on("window:maximized", () => {
    //         isMaximized.value = true;
    //     });
    //     window.electronAPI.on("window:unmaximized", () => {
    //         isMaximized.value = false;
    //     });
    // }

    // 监听全屏状态
    // const handleFullscreenChange = () => {
    //     isFullscreen.value = document.fullscreenElement !== null;
    // };
    // document.addEventListener("fullscreenchange", handleFullscreenChange);
    // document.addEventListener(
    //     "webkitfullscreenchange",
    //     handleFullscreenChange,
    // );
    // document.addEventListener(
    //     "mozfullscreenchange",
    //     handleFullscreenChange,
    // );
    // document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    // // 恢复之前的播放状态
    // if (playerStore.currentState.currentSongId) {
    //     const song = playerStore.currentSong;
    //     if (song) {
    //         audioPlayer.play(song, playerStore.currentState.currentTime);
    //         if (playerStore.currentState.isPlaying) {
    //             audioPlayer.resume();
    //         }
    //     }
    // }
  })

  // 应用卸载时保存数据
  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)

    // 移除事件监听
    if (window.electronAPI) {
      // 注意：实际中需要更精确地移除事件监听
      // 这里简化处理
    }
  })

  // 自动保存（每30秒或状态变化时）
  let saveTimeout: number | null = null
  const autoSave = () => {
    // if (saveTimeout) {
    //     clearTimeout(saveTimeout);
    // }
    // saveTimeout = window.setTimeout(() => {
    //     persistenceManager.saveAllData({
    //         songs: playerStore.songs,
    //         playlists: playerStore.playlists,
    //         playbackState: playerStore.currentState,
    //         settings: playerStore.settings,
    //     });
    // }, 30000); // 30秒后保存
  }

  // 监听状态变化，触发自动保存
  // watch(
  //   () => [playerStore.songs.length, playerStore.playlists.length, playerStore.currentState.currentSongId, playerStore.currentState.currentTime],
  //   autoSave,
  //   { deep: true }
  // )
</script>

<style scoped lang="scss">
  #desktop {
    height: 100vh;
    display: flex;
    flex-direction: column;
    // background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    // background: rgba(250, 250, 252, 0.75); /* 半透明浅色，非纯白 */
    // backdrop-filter: blur(12px); /* 毛玻璃效果，提升质感 */
    // border-radius: 20px;
    // box-shadow: 0 20px 60px rgba(0, 0, 0, 0.05); /* 极淡阴影，保持轻盈 */
    // color: white;
  }

  .main-container {
    flex-grow: 1;
    height: 100%;
    padding: 10px;
    display: flex;
    flex-direction: row;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    height: 100%;
    padding-left: 20px;

    .view-container {
      width: 100%;
      height: 100%;
    }
  }

  .app-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .app-header h1 {
    font-size: 2.5em;
    margin-bottom: 10px;
  }

  .subtitle {
    font-size: 1.2em;
    opacity: 0.8;
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin: 40px 0;
  }

  .feature-card {
    background: rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 10px;
    backdrop-filter: blur(10px);
    transition: transform 0.3s;
  }

  .feature-card:hover {
    transform: translateY(-5px);
  }

  .demo-section {
    background: rgba(255, 255, 255, 0.1);
    padding: 30px;
    border-radius: 15px;
    margin: 40px 0;
    backdrop-filter: blur(10px);
  }

  .demo-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    margin-top: 20px;
  }

  .demo-button {
    padding: 10px 20px;
    background: white;
    color: #667eea;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    transition: transform 0.2s;
  }

  .demo-button:hover {
    transform: scale(1.05);
  }

  .system-info {
    background: rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 10px;
    margin: 40px 0;
    backdrop-filter: blur(10px);
  }

  .app-footer {
    text-align: center;
    padding: 20px;
    opacity: 0.7;
    font-size: 0.9em;
  }
</style>
