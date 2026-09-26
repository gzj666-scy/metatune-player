<script setup lang="ts">
  import { ref, computed, toRaw, onMounted, onUnmounted } from 'vue'
  import { getFirstLetter, IconEnum, ModalType, SortTypeItems } from '@metatune/common-v2'
  import type { ISong } from '@metatune/common-v2'
  import SongItem from '@/components/business/SongItem.vue'
  import { getStoreManager } from '@/utils/storeManager'
  import ListToolBar from '@/components/business/ListToolBar.vue'
  import IconBase from '@/components/base/IconBase.vue'
  import { Modal } from '@/utils/modal'
  import { useRoute } from 'vue-router'

  // 虚拟滚动：行高固定（见 SongItem.vue 的 .song-item height），所以窗口位置可以纯算术推导
  const ROW_HEIGHT = 61
  // 视口上下各多渲染几行，抵消快速滚动时的空白
  const OVERSCAN = 6

  const route = useRoute()

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const searchQueryRef = ref('')
  const showBatchActionsRef = ref(false)
  // 选中项用 Set：列表每行都要判断自己是否被选中，数组 includes 是 O(n)、整体 O(n²)；
  // Set 的 has 是 O(1)，且 Vue 对 Set 按 key 追踪，增删单个 uid 不会触发其它行重渲染
  const selectedSongsRef = ref(new Set<string>())
  const isLookPlaylistRef = ref(false)
  // 字母导航
  const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '#']
  const currentAlphaRef = ref('')
  const clickAlphaRef = ref(false)
  const delayClickAlphaMarkRef = ref<number>()
  const songListContainerRef = ref<HTMLDivElement>()
  // 虚拟滚动状态：只存滚动位置与视口高度，可见区间由 computed 推导
  const scrollTopRef = ref(0)
  const viewportHeightRef = ref(0)
  let viewportObserver: ResizeObserver | null = null

  const listKey = computed(() => playerStore.currentViewKey)
  const sortType = computed(() => {
    return playerStore.playlists[listKey.value]?.sortType || SortTypeItems[0].value
  })
  const filteredSongs = computed(() => {
    let songs: ISong[] = []
    if (route.params.name && playerStore.currentArtistName === route.params.name) {
      // 歌手歌曲列表
      songs = [...toRaw(playerStore.currentArtistSongs)]
    } else if (route.params.name && playerStore.currentAlbumName === route.params.name) {
      // 专辑歌曲列表
      songs = [...toRaw(playerStore.currentAlbumSongs)]
    } else if (route.params.name && playerStore.currentFolderName === route.params.name) {
      // 文件夹歌曲列表
      songs = [...toRaw(playerStore.currentFolderSongs)]
    } else if (listKey.value === playerStore.currentState.currentListId) {
      songs = [...toRaw(playerStore.currentPlaylistSongs)]
    } else {
      songs = [...toRaw(playerStore.currentViewPlaylistSongs)]
    }
    // 搜索过滤
    if (searchQueryRef.value) {
      const query = searchQueryRef.value.toLowerCase()
      songs = songs.filter(
        song =>
          song.title.toLowerCase().includes(query) ||
          song.artist.toLowerCase().includes(query) ||
          song.album.toLowerCase().includes(query) ||
          song.fileName.toLowerCase().includes(query)
      )
    }
    return songs
  })
  const totalHeight = computed(() => filteredSongs.value.length * ROW_HEIGHT)
  // 列表变短时 scrollTop 会越界，先夹紧再换算，否则窗口算出来的位置会落在列表外
  const safeScrollTop = computed(() => Math.min(scrollTopRef.value, Math.max(totalHeight.value - viewportHeightRef.value, 0)))
  const startIndex = computed(() => Math.max(Math.floor(safeScrollTop.value / ROW_HEIGHT) - OVERSCAN, 0))
  const endIndex = computed(() => {
    const visibleCount = Math.ceil(viewportHeightRef.value / ROW_HEIGHT) + OVERSCAN * 2
    return Math.min(startIndex.value + visibleCount, filteredSongs.value.length)
  })
  const visibleSongs = computed(() => filteredSongs.value.slice(startIndex.value, endIndex.value))
  // 窗口用 padding 顶下去而非绝对定位：撑高元素的高度恒等于 totalHeight，不会多出溢出区域
  const windowOffset = computed(() => startIndex.value * ROW_HEIGHT)
  const isAllSelected = computed(() => {
    if (filteredSongs.value.length === 0) return false
    return filteredSongs.value.every(song => selectedSongsRef.value.has(song.uid))
  })
  const showAlphaNav = computed(() => {
    return !searchQueryRef.value && filteredSongs.value.length > 20 && sortType.value !== 'addTime'
  })
  // 字母导航只在 title / artist / fileName 三种排序下出现
  const alphaField = computed(() => sortType.value as 'title' | 'artist' | 'fileName')
  const songLetter = (song: ISong) => getFirstLetter(song[alphaField.value], song.isValid)

  const onSearchChange = (data: string) => {
    searchQueryRef.value = data
  }

  const onBatchChange = (data: boolean) => {
    if (filteredSongs.value.length <= 0) return
    showBatchActionsRef.value = data
    if (!data) {
      selectedSongsRef.value = new Set()
      isLookPlaylistRef.value = false
    }
  }

  const onSelectAll = () => {
    if (isAllSelected.value) {
      selectedSongsRef.value = new Set()
    } else {
      selectedSongsRef.value = new Set(filteredSongs.value.map(song => song.uid))
    }
  }

  const onToggleSelectSong = (songId: string) => {
    const selected = selectedSongsRef.value
    if (selected.has(songId)) {
      selected.delete(songId)
    } else {
      selected.add(songId)
    }
  }

  const onAddToPlayList = () => {
    if (selectedSongsRef.value.size > 0) {
      playerStore.modal = {
        type: ModalType.AddToPlaylist,
        // 弹窗按数组消费，Set 要摊平再传
        data: { songIds: [...selectedSongsRef.value], cover: isLookPlaylistRef.value },
        closeCallBack: () => {
          showBatchActionsRef.value = false
          selectedSongsRef.value = new Set()
          isLookPlaylistRef.value = false
        },
      }
    }
  }

  const onRemoveSongs = async () => {
    if (selectedSongsRef.value.size > 0) {
      const result = await Modal.confirm(`确定要移除选中的 ${selectedSongsRef.value.size} 首歌曲吗？`, '确认移除')
      if (result) {
        storeManager.removeSongs([...selectedSongsRef.value], listKey.value)
        showBatchActionsRef.value = false
        selectedSongsRef.value = new Set()
        isLookPlaylistRef.value = false
      }
    }
  }

  const onLookPlaylistSongs = async () => {
    const name = await Modal.prompt('输入查看歌单')
    const playlist = storeManager.getPlaylistByName(name || '')
    const songIds = playlist?.songIds || []
    if (songIds.length > 0 && filteredSongs.value.length > 0) {
      onBatchChange(true)
      selectedSongsRef.value = new Set(songIds)
      isLookPlaylistRef.value = true
    }
  }

  /** 滚到指定行号，列表是固定行高，所以直接给 scrollTop 即可 */
  const scrollToIndex = (index: number) => {
    const container = songListContainerRef.value
    if (!container || index < 0) return
    container.scrollTop = index * ROW_HEIGHT
    scrollTopRef.value = container.scrollTop
  }

  const onScrollToCurrentSong = () => {
    const container = songListContainerRef.value
    const currentSongId = playerStore.currentState.currentSongId
    if (!container || !currentSongId) return
    const index = filteredSongs.value.findIndex(song => song.uid === currentSongId)
    if (index < 0) return
    // 居中显示
    const centered = index * ROW_HEIGHT - Math.max((container.clientHeight - ROW_HEIGHT) / 2, 0)
    container.scrollTop = Math.max(centered, 0)
    scrollTopRef.value = container.scrollTop
  }

  const onScrollToAlpha = (letter: string) => {
    const index = filteredSongs.value.findIndex(song => songLetter(song) === letter)
    if (index < 0) return
    clearTimeout(delayClickAlphaMarkRef.value)
    currentAlphaRef.value = letter
    // 程序化滚动期间屏蔽滚动联动，否则高亮会被 updateActiveAlpha 立刻改回去
    clickAlphaRef.value = true
    delayClickAlphaMarkRef.value = window.setTimeout(() => {
      clickAlphaRef.value = false
    }, 300)
    scrollToIndex(index)
  }

  /** 由 scrollTop 直接反推首行完全可见的行号，O(1)，不再逐行 getBoundingClientRect */
  const updateActiveAlpha = (top: number) => {
    if (clickAlphaRef.value) return
    if (!showAlphaNav.value) return
    const songs = filteredSongs.value
    if (songs.length === 0) return
    // 行 i 占据 [i * H, (i + 1) * H)，首个完全可见的行号即 ceil(top / H)
    const index = Math.min(Math.ceil(top / ROW_HEIGHT), songs.length - 1)
    const song = songs[index]
    if (song) currentAlphaRef.value = songLetter(song)
  }

  const onScroll = () => {
    const container = songListContainerRef.value
    if (!container) return
    scrollTopRef.value = container.scrollTop
    // 容器尺寸变化靠 ResizeObserver，这里只兜底首帧未量到的情况
    if (viewportHeightRef.value !== container.clientHeight) viewportHeightRef.value = container.clientHeight
    updateActiveAlpha(container.scrollTop)
  }

  onMounted(() => {
    const container = songListContainerRef.value
    if (!container) return
    viewportHeightRef.value = container.clientHeight
    viewportObserver = new ResizeObserver(() => {
      viewportHeightRef.value = container.clientHeight
    })
    viewportObserver.observe(container)
  })

  onUnmounted(() => {
    viewportObserver?.disconnect()
    viewportObserver = null
    clearTimeout(delayClickAlphaMarkRef.value)
  })
</script>

<template>
  <section class="song-list-view">
    <!-- 工具栏 -->
    <ListToolBar
      :listKey="listKey"
      :sortType="sortType"
      :isBatch="showBatchActionsRef"
      @search-change="onSearchChange"
      @batch-change="onBatchChange"
      @add-to-playlist="onAddToPlayList"
      @remove-songs="onRemoveSongs"
      @look-playlist-songs="onLookPlaylistSongs"
    />
    <div class="song-list-main">
      <div class="song-list-main-l">
        <div v-if="showBatchActionsRef" class="selected-count">
          <input type="checkbox" :checked="isAllSelected" @click.stop @change="onSelectAll" />
          <span>已选 {{ selectedSongsRef.size }} 首</span>
        </div>
        <!-- 歌曲列表：虚拟滚动，只渲染可见区间 -->
        <div class="song-list-container">
          <div class="song-list" ref="songListContainerRef" @scroll="onScroll">
            <div v-if="filteredSongs.length > 0" class="list-phantom" :style="{ height: `${totalHeight}px` }">
              <div class="list-window" :style="{ paddingTop: `${windowOffset}px` }">
                <SongItem
                  v-for="(item, index) in visibleSongs"
                  :key="item.uid"
                  :index="startIndex + index"
                  :song="item"
                  :list-key="listKey"
                  :isBatch="showBatchActionsRef"
                  :selected="selectedSongsRef.has(item.uid)"
                  :onSelect="onToggleSelectSong"
                />
              </div>
            </div>
            <div v-else class="list-empty">
              <IconBase>
                <component :is="IconEnum.Empty" />
              </IconBase>
              <span>空空如也</span>
            </div>
          </div>
        </div>

        <!-- 定位到当前播放按钮 -->
        <button
          v-if="playerStore.currentState.currentSongId && filteredSongs.length > 20"
          class="jump-to-current-btn"
          @click="onScrollToCurrentSong"
          title="定位到正在播放的歌曲"
        >
          <IconBase>
            <component :is="IconEnum.Locate" />
          </IconBase>
        </button>
      </div>
      <!-- 字母导航侧边栏 -->
      <div v-if="showAlphaNav" class="alpha-nav">
        <button
          v-for="letter in alphabet"
          :key="letter"
          class="alpha-nav-item"
          :class="{ active: currentAlphaRef === letter }"
          @click="onScrollToAlpha(letter)"
        >
          {{ letter }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
  .song-list-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;

    .song-list-main {
      flex-grow: 1;
      min-height: 0; /* 关键！解除默认的 min-content 约束 */
      display: flex;
      gap: 4px;

      .song-list-main-l {
        width: 100%;
        position: relative;
        display: flex;
        flex-direction: column;

        .selected-count {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 14px;
          line-height: 120%;
          color: var(--text-color-primary);
          padding-bottom: 16px;

          input {
            width: 14px;
            height: 14px;
          }
        }

        .song-list-container {
          flex: 1;
          width: 100%;
          min-height: 0;

          .song-list {
            width: 100%;
            height: 100%;
            overflow: auto;
            padding-right: 4px;

            .list-empty {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 12px;

              svg {
                width: 48px;
              }
            }
          }
        }

        .jump-to-current-btn {
          position: absolute;
          right: 5px;
          bottom: 50px;
          color: var(--btn-secondary-text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          transition: all 0.2s;

          &:hover {
            transform: scale(1.1);
          }
        }
      }

      .alpha-nav {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 2px;

        .alpha-nav-item {
          width: 16px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: var(--text-color-secondary);
          cursor: pointer;
          border-radius: 2px;

          &:hover,
          &.active {
            background: var(--btn-primary-bg);
            color: white;
          }
        }
      }
    }
  }
</style>
