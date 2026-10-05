<script setup lang="ts">
  import { DefaultKey, IconEnum, PanelType, SortTypeItems } from '@metatune/common'
  import type { ISong, IImportResult, SortTypeItemsIds } from '@metatune/common'
  import { ref, toRaw, watch } from 'vue'
  import { getStoreManager } from '@/utils/storeManager'
  import IconBase from '@/components/base/IconBase.vue'
  import { Loading } from '@/utils/loading'
  import { Modal } from '@/utils/modal'
  import { useRouter } from 'vue-router'
  import { getPlayManager } from '@/utils/playManager'

  interface Props {
    listKey: string
    isBatch: boolean
    sortType: SortTypeItemsIds
    title?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    listKey: '',
    sortType: SortTypeItems[0].value,
    title: '',
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

  function handleSearchChange() {
    emit('search-change', searchQueryRef.value)
  }

  watch(searchQueryRef, handleSearchChange)

  function handleClearSearch() {
    searchQueryRef.value = ''
  }

  function handleBack() {
    router.back()
  }

  function handleLookSongs() {
    emit('look-playlist-songs')
  }

  /** 构造导入结果弹窗内容（成功/失败/跳过 + 失败原因明细） */
  function buildImportReport(result: IImportResult): string {
    const lines: string[] = []
    const total = result.songs.length + result.errors.length + result.skipped.length
    lines.push(`共 ${total} 个文件：成功 ${result.songs.length}，失败 ${result.errors.length}，跳过 ${result.skipped.length}`)
    if (result.errors.length > 0) {
      lines.push('')
      lines.push('失败原因：')
      result.errors.forEach(err => {
        const name = err.filePath.split(/[\\/]/).pop() || err.filePath
        lines.push(`· ${name}：${err.reason}`)
      })
    }
    return lines.join('\n')
  }

  /** 导入并展示结果弹窗（v3：主进程并发解析 + 进度上报） */
  async function importAndReport(paths: string[]) {
    Loading.show()
    try {
      const result = await window.electronAPI.importAudio(paths, (done, total, fileName) => {
        console.log(`导入进度 ${done}/${total}: ${fileName}`)
      })
      storeManager.addSongs(result.songs)
      await Modal.alert(buildImportReport(result), '导入结果')
    } finally {
      Loading.hide()
    }
  }

  async function onImportLocalSongs() {
    if (!window.electronAPI) return
    const file = await window.electronAPI.openFileDialog()
    if (file.filePaths.length > 0) {
      await importAndReport(file.filePaths)
    }
  }

  async function onImportLocalFolder() {
    if (!window.electronAPI) return
    const file = await window.electronAPI.openDirectoryDialog()
    if (file.filePaths.length > 0) {
      storeManager.addSongDirs(file.filePaths)
      await importAndReport(file.filePaths)
    }
  }

  /**
   * v3 刷新列表：先增量扫描监视目录，只解析新增/变更的文件，不再全量重扫。
   */
  async function onRefreshList() {
    if (!window.electronAPI) return
    const dirs = toRaw(playerStore.songDirs)
    if (!dirs || dirs.length === 0) return

    Loading.show()
    try {
      const scan = await window.electronAPI.scanAudioDirs(dirs, toRaw(playerStore.songs))
      const needParse = [...scan.newFiles, ...scan.changedFiles]
      console.log(`增量扫描：新增 ${scan.newFiles.length}，变更 ${scan.changedFiles.length}，移除 ${scan.removedPaths.length}`)

      if (needParse.length === 0 && scan.removedPaths.length === 0) {
        await Modal.alert('曲库无变化', '刷新结果')
        return
      }

      let newSongs: ISong[] = []
      let changedSongs: ISong[] = []
      if (needParse.length > 0) {
        const result = await window.electronAPI.importAudio(needParse)
        const newSet = new Set(scan.newFiles)
        newSongs = result.songs.filter(s => newSet.has(s.filePath))
        changedSongs = result.songs.filter(s => !newSet.has(s.filePath))
        if (result.errors.length > 0) {
          console.warn('增量刷新部分文件解析失败:', result.errors)
        }
      }

      const summary = storeManager.applyScanResult(newSongs, changedSongs, scan.removedPaths)
      await Modal.alert(`新增 ${summary.added} 首，更新 ${summary.updated} 首，移除失效 ${summary.removed} 首`, '刷新结果')

      // 正在播放的歌曲被移除时重置进度
      const { currentSongId } = playerStore.currentState
      if (!currentSongId) playManager.seekTo(0)
    } finally {
      Loading.hide()
    }
  }

  function onOpenSortPanel(e: MouseEvent) {
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

  function onToggleBatch(data: boolean) {
    emit('batch-change', data)
  }

  function onAddToPlayList() {
    emit('add-to-playlist')
  }

  function onRemoveLocalSongs() {
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
        <button
          v-if="[DefaultKey.Artist, DefaultKey.Album, DefaultKey.Folder].includes(listKey)"
          class="btn"
          @click="handleBack"
          title="返回"
        >
          <IconBase>
            <component :is="IconEnum.Back" />
          </IconBase>
        </button>
        <div v-else class="search-box">
          <IconBase class="search-box-icon">
            <component :is="IconEnum.Search" />
          </IconBase>
          <input v-model="searchQueryRef" type="text" placeholder="搜索歌曲..." class="search-input" />
          <IconBase v-if="searchQueryRef.length > 0" class="search-box-icon clear" @click="handleClearSearch">
            <component :is="IconEnum.CircleCloseFilled" />
          </IconBase>
        </div>
        <div v-if="title" class="tool-title">{{ title }}</div>
      </div>
      <div class="toolbar-right">
        <button v-if="listKey === DefaultKey.Local" class="btn" @click="handleLookSongs" title="查看歌单歌曲">
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

      .tool-title {
        font-size: 14px;
        color: var(--text-color-primary);
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
          color: var(--btn-primary-hover-bg);
        }
      }
    }
  }
</style>
