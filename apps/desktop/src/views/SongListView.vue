<script setup lang="ts">
  import { ref, computed, toRaw, onUnmounted } from 'vue'
  import { getFirstLetter, IconEnum, ModalType, SortTypeItems, useRefs } from '@metatune/common'
  import type { ISong } from '@metatune/common'
  import SongItem from '@/components/business/SongItem.vue'
  import { getStoreManager } from '@/utils/storeManager'
  import ListToolBar from '@/components/business/ListToolBar.vue'
  import IconBase from '@/components/base/IconBase.vue'
  import { debounce } from 'lodash'
  import { Modal } from '@/utils/modal'
  import { useRoute } from 'vue-router'

  const route = useRoute()

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const searchQueryRef = ref('')
  const showBatchActionsRef = ref(false)
  const selectedSongsRef = ref<string[]>([])
  const isLookPlaylistRef = ref(false)
  // 字母导航
  const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '#']
  const currentAlphaRef = ref('')
  const clickAlphaRef = ref(false)
  const delayClickAlphaMarkRef = ref<number>()
  const songListContainerRef = ref<HTMLDivElement>()
  const [itemRefs, setRefs] = useRefs<InstanceType<typeof SongItem>>()

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
  const isAllSelected = computed(() => {
    if (filteredSongs.value.length === 0) return false
    return filteredSongs.value.every(song => selectedSongsRef.value.includes(song.uid))
  })
  const showAlphaNav = computed(() => {
    return !searchQueryRef.value && filteredSongs.value.length > 20 && sortType.value !== 'addTime'
  })

  const onSearchChange = (data: string) => {
    searchQueryRef.value = data
  }

  const onBatchChange = (data: boolean) => {
    if (filteredSongs.value.length <= 0) return
    showBatchActionsRef.value = data
    if (!data) {
      selectedSongsRef.value = []
      isLookPlaylistRef.value = false
    }
  }

  const onSelectAll = () => {
    if (isAllSelected.value) {
      selectedSongsRef.value = []
    } else {
      selectedSongsRef.value = filteredSongs.value.map(song => song.uid)
    }
  }

  const onToggleSelectSong = (songId: string) => {
    const index = selectedSongsRef.value.indexOf(songId)
    if (index > -1) {
      selectedSongsRef.value.splice(index, 1)
    } else {
      selectedSongsRef.value.push(songId)
    }
  }

  const onAddToPlayList = () => {
    if (selectedSongsRef.value && selectedSongsRef.value.length > 0) {
      playerStore.modal = {
        type: ModalType.AddToPlaylist,
        data: { songIds: selectedSongsRef.value, cover: isLookPlaylistRef.value },
        closeCallBack: () => {
          showBatchActionsRef.value = false
          selectedSongsRef.value = []
          isLookPlaylistRef.value = false
        },
      }
    }
  }

  const onRemoveSongs = async () => {
    if (selectedSongsRef.value && selectedSongsRef.value.length > 0) {
      const result = await Modal.confirm(`确定要移除选中的 ${selectedSongsRef.value.length} 首歌曲吗？`, '确认移除')
      if (result) {
        storeManager.removeSongs(selectedSongsRef.value, listKey.value)
        showBatchActionsRef.value = false
        selectedSongsRef.value = []
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
      selectedSongsRef.value = [...songIds]
      isLookPlaylistRef.value = true
    }
  }

  const onScrollToCurrentSong = () => {
    const currentSongId = playerStore.currentState.currentSongId
    if (currentSongId) {
      const element = document.querySelector(`[data-song-id="${currentSongId}"]`)
      element?.scrollIntoView({ behavior: 'auto', block: 'center' })
    }
  }

  const onScrollToAlpha = (letter: string) => {
    clearTimeout(delayClickAlphaMarkRef.value)
    currentAlphaRef.value = letter
    if (songListContainerRef.value) {
      const firstSongWithAlpha = filteredSongs.value.find(song => {
        // @ts-expect-error 不需要检测
        const testStr = song[sortType.value]
        return getFirstLetter(testStr, song.isValid) === letter
      })
      if (firstSongWithAlpha) {
        clickAlphaRef.value = true
        const element = document.querySelector(`[data-song-id="${firstSongWithAlpha.uid}"]`)
        element?.scrollIntoView({ behavior: 'auto', block: 'start' })
        delayClickAlphaMarkRef.value = window.setTimeout(() => {
          clickAlphaRef.value = false
        }, 300)
      }
    }
  }

  const updateActiveAlpha = () => {
    if (clickAlphaRef.value) return
    if (!showAlphaNav) return
    const container = songListContainerRef.value
    if (!container) return
    if (itemRefs.length === 0) return

    const rect = container.getBoundingClientRect()
    const containerTop = rect.top
    const containerBottom = rect.bottom

    // 1. 收集当前可见区域内的所有字母
    // let visibleLetters = new Set()
    let minDistance = Infinity
    let topMostUid = null

    // /@ts-expect-error 不需要检测
    for (const item of itemRefs) {
      const el = item?.$el as HTMLElement
      if (el) {
        const elRect = el.getBoundingClientRect()
        // 检查元素是否与容器相交（可见）
        // const isVisible = !(elRect.bottom < containerTop || elRect.top > containerBottom)
        const isVisible = elRect.top >= containerTop && elRect.bottom <= containerBottom
        if (isVisible) {
          // 收集字母
          const uid = el.dataset.songId
          // const song = filteredSongs.value.find(s => s.uid === uid)
          // if (song) {
          //   const letter = getFirstLetter(song[sortType.value as 'title' | 'artist' | 'fileName'])
          //   visibleLetters.add(letter)
          // }
          // 找出最顶部的 visible element
          const distance = Math.abs(elRect.top - containerTop)
          if (distance < minDistance) {
            minDistance = distance
            topMostUid = uid
            break
          }
        }
      }
    }
    // 2. 如果当前高亮的字母还在可见区域内，保持它
    // if (currentAlphaRef.value && visibleLetters.has(currentAlphaRef.value)) {
    //   return
    // }

    // 3. 否则，更新到最顶部的字母
    if (topMostUid) {
      const song = filteredSongs.value.find(s => s.uid === topMostUid)
      if (song) {
        const newLetter = getFirstLetter(song[sortType.value as 'title' | 'artist' | 'fileName'], song.isValid)
        currentAlphaRef.value = newLetter
      }
    }
  }

  const onScroll = debounce(() => {
    updateActiveAlpha()
  }, 100)

  onUnmounted(() => {
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
          <span>已选 {{ selectedSongsRef.length }} 首</span>
        </div>
        <!-- 歌曲列表 -->
        <div class="song-list-container">
          <div v-if="filteredSongs.length > 0" class="song-list" ref="songListContainerRef" @scroll="onScroll">
            <SongItem
              v-for="(item, index) in filteredSongs"
              :key="item.uid"
              :index="index"
              :song="item"
              :list-key="listKey"
              :isBatch="showBatchActionsRef"
              :selected="selectedSongsRef.includes(item.uid)"
              :onSelect="onToggleSelectSong"
              :ref="setRefs(index)"
            />
          </div>
          <div v-else class="list-empty">
            <IconBase>
              <component :is="IconEnum.Empty" />
            </IconBase>
            <span>空空如也</span>
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
          }

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
