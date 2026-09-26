<script setup lang="ts">
  import { DefaultKey, IconEnum, PanelType, SortTypeItems } from '@metatune/common-v2'
  import type { SortTypeItemsIds } from '@metatune/common-v2'
  import { onUnmounted, ref, toRaw, watch } from 'vue'
  import { debounce } from 'lodash'
  import { getStoreManager } from '@/utils/storeManager'
  import { showImportResult } from '@/utils/importResult'
  import IconBase from '@/components/base/IconBase.vue'
  import { Loading } from '@/utils/loading'
  import { useRouter } from 'vue-router'
  import { getPlayManager } from '@/utils/playManager'

  interface Props {
    listKey: string
    isBatch: boolean
    sortType: SortTypeItemsIds
  }

  const props = withDefaults(defineProps<Props>(), {
    listKey: '',
    sortType: SortTypeItems[0].value,
  })

  const emit = defineEmits<{
    'search-change': [data: string]
    'batch-change': [data: boolean]
    'add-to-playlist': []
    'remove-songs': []
    'look-playlist-songs': []
  }>()

  const router = useRouter()

  const playManager = getPlayManager()
  const storeManager = getStoreManager()
  const { playerStore } = storeManager

  const searchQueryRef = ref('')

  // 大曲库下每敲一键都要重算整表过滤，等输入停下再发；清空则立即生效，不让用户等防抖
  const SEARCH_DEBOUNCE = 150
  const emitSearchChange = debounce((query: string) => emit('search-change', query), SEARCH_DEBOUNCE)

  watch(searchQueryRef, query => {
    if (query) {
      emitSearchChange(query)
    } else {
      emitSearchChange.cancel()
      emit('search-change', '')
    }
  })

  onUnmounted(() => emitSearchChange.cancel())

  const onClearSearch = () => {
    searchQueryRef.value = ''
  }

  const onBack = () => {
    router.back()
  }

  const onLookSongs = async () => {
    emit('look-playlist-songs')
  }

  /** 统一包一层 Loading，扫描期间禁止重复触发 */
  const runScan = async (paths: string[]) => {
    Loading.show()
    try {
      return await window.electronAPI.scanAudio(paths)
    } finally {
      Loading.hide()
    }
  }

  /** 统计本次扫描里有多少是曲库里没有的新歌 */
  const countAdded = (songs: { uid: string }[]) => {
    const known = new Set(toRaw(playerStore.songs).map(v => v.uid))
    let added = 0
    for (const song of songs) if (!known.has(song.uid)) added++
    return added
  }

  const onImportLocalSongs = async () => {
    if (!window.electronAPI) return
    const file = await window.electronAPI.openFileDialog()
    if (file.filePaths.length === 0) return

    const result = await runScan(file.filePaths)
    const added = countAdded(result.songs)
    storeManager.addSongs(result.songs)
    showImportResult(
      '导入完成',
      { total: result.songs.length, added, updated: Math.max(result.parsed - added, 0), skipped: result.skipped, invalidated: 0 },
      result.failures
    )
  }

  const onImportLocalFolder = async () => {
    if (!window.electronAPI) return
    const file = await window.electronAPI.openDirectoryDialog()
    if (file.filePaths.length === 0) return

    // 先记住目录，「刷新列表」之后就在这些目录里做增量扫描
    storeManager.addSongDirs(file.filePaths)
    const result = await runScan(file.filePaths)
    const added = countAdded(result.songs)
    storeManager.addSongs(result.songs)
    showImportResult(
      '导入完成',
      { total: result.songs.length, added, updated: Math.max(result.parsed - added, 0), skipped: result.skipped, invalidated: 0 },
      result.failures
    )
  }

  /**
   * 刷新列表：只解析新增文件和内容变更的文件，未变更的直接复用缓存，
   * 因此曲库越大，省下的时间越多。
   */
  const onRefreshList = async () => {
    if (!window.electronAPI) return
    const filePaths = toRaw(playerStore.songDirs)
    if (!filePaths?.length) return

    const result = await runScan(filePaths)

    // 一个文件都没扫到、但存在明确失败原因时多半是权限/磁盘问题，此时不能把曲库清空
    if (result.songs.length === 0 && playerStore.songs.length > 0 && result.failures.length > 0) {
      showImportResult('刷新失败', { total: 0, added: 0, updated: 0, skipped: 0, invalidated: 0 }, result.failures)
      return
    }

    const stats = storeManager.refreshSongs(result.songs)
    if (stats.reset) playManager.seekTo(0)

    showImportResult(
      '刷新完成',
      {
        total: result.songs.length,
        added: stats.added,
        updated: Math.max(result.parsed - stats.added, 0),
        skipped: result.skipped,
        invalidated: stats.invalidated,
      },
      result.failures
    )
  }

  const onOpenSortPanel = (e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const windowWidth = window.innerWidth
    let style
    if (rect.left > windowWidth / 2) {
      style = {
        top: `${rect.bottom + 8}px`,
        right: `${windowWidth - rect.right}px`,
      }
    } else {
      style = {
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
      }
    }
    playerStore.panel = { type: PanelType.SortMode, data: { value: props.sortType, listKey: props.listKey, style } }
  }

  const onToggleBatch = (data: boolean) => {
    emit('batch-change', data)
  }

  const onAddToPlayList = () => {
    emit('add-to-playlist')
  }

  const onRemoveLocalSongs = () => {
    emit('remove-songs')
  }
</script>

<template>
  <div class="toolbar">
    <!-- 批量操作面板 -->
    <div v-if="isBatch" class="tool-box">
      <div class="toolbar-left">
        <button
          v-if="[DefaultKey.Local, DefaultKey.Favorite, DefaultKey.Artist, DefaultKey.Album, DefaultKey.Folder].includes(listKey)"
          class="btn"
          @click="onAddToPlayList"
          title="添加到歌单"
        >
          <IconBase>
            <component :is="IconEnum.Plus" />
          </IconBase>
        </button>
        <button class="btn" @click="onRemoveLocalSongs" title="移除选中">
          <IconBase>
            <component :is="IconEnum.Delete" />
          </IconBase>
        </button>
      </div>
      <div class="toolbar-right">
        <button class="btn-batch" @click="onToggleBatch(false)">退出批量操作</button>
      </div>
    </div>
    <div v-else class="tool-box">
      <div class="toolbar-left">
        <button v-if="[DefaultKey.Artist, DefaultKey.Album, DefaultKey.Folder].includes(listKey)" class="btn" @click="onBack" title="返回">
          <IconBase>
            <component :is="IconEnum.Back" />
          </IconBase>
        </button>
        <div v-else class="search-box">
          <IconBase class="search-box-icon">
            <component :is="IconEnum.Search" />
          </IconBase>
          <input v-model="searchQueryRef" type="text" placeholder="搜索歌曲..." class="search-input" />
          <IconBase v-if="searchQueryRef.length > 0" class="search-box-icon clear" @click="onClearSearch">
            <component :is="IconEnum.CircleCloseFilled" />
          </IconBase>
        </div>
      </div>
      <div class="toolbar-right">
        <button v-if="listKey === DefaultKey.Local" class="btn" @click="onLookSongs" title="查看歌单歌曲">
          <IconBase>
            <component :is="IconEnum.Eye" />
          </IconBase>
        </button>
        <button v-if="listKey === DefaultKey.Local" class="btn" @click="onImportLocalSongs" title="导入本地歌曲">
          <IconBase>
            <component :is="IconEnum.FileInput" />
          </IconBase>
        </button>
        <button v-if="listKey === DefaultKey.Local" class="btn" @click="onImportLocalFolder" title="导入本地文件夹">
          <IconBase>
            <component :is="IconEnum.FolderInput" />
          </IconBase>
        </button>
        <button v-if="listKey === DefaultKey.Local" class="btn" @click="onRefreshList" title="刷新列表">
          <IconBase>
            <component :is="IconEnum.RefreshCw" />
          </IconBase>
        </button>
        <button
          v-if="![DefaultKey.Artist, DefaultKey.Album, DefaultKey.Folder].includes(listKey)"
          class="btn"
          @click.stop="onOpenSortPanel"
          title="排序方式"
        >
          <IconBase>
            <component :is="IconEnum.ArrowDownUp" />
          </IconBase>
        </button>
        <button class="btn" @click="onToggleBatch(true)" title="批量操作">
          <IconBase>
            <component :is="IconEnum.ListChecks" />
          </IconBase>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .toolbar {
    flex-shrink: 0;
    padding: 0 0 16px 0;

    .tool-box {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;

      .toolbar-left {
        height: 100%;
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .btn {
        width: 30px;
        height: 30px;
        background: var(--btn-secondary-bg);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 14px;
        transition: all 0.2s;
        color: var(--btn-primary-bg);

        svg {
          width: 16px;
        }

        &:hover {
          // filter: brightness(0.5);
          color: var(--btn-primary-hover-bg);
        }
      }

      .search-box {
        width: 200px;
        height: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        border-radius: 50px;
        border: 1px var(--text-color-secondary) solid;
        padding: 0 10px;

        .search-box-icon {
          width: 14px;
          color: var(--text-color-secondary);

          &.clear {
            cursor: pointer;
          }
        }

        .search-input {
          flex-grow: 1;
          color: var(--text-color-primary);
          font-size: 12px;

          &::placeholder {
            color: var(--text-color-secondary);
          }
        }
      }

      .btn-batch {
        height: 30px;
        padding: 0 10px;
        background: var(--btn-secondary-bg);
        border-radius: 50px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 12px;
        transition: all 0.2s;
        color: var(--btn-primary-bg);

        &:hover {
          // filter: brightness(2);
          color: var(--btn-primary-hover-bg);
        }
      }
    }
  }
</style>
