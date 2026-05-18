<script setup lang="ts">
  import { DefaultKey, IconEnum, PanelType, SortTypeItems } from '@metatune/common'
  import type { ISong, SortTypeItemsIds } from '@metatune/common'
  import { ref, watch } from 'vue'
  import { getStoreManager } from '@/utils/storeManager'
  import IconBase from '@/components/base/IconBase.vue'
  import { Loading } from '@/utils/loading'
  import { useRouter } from 'vue-router'

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
  }>()

  const router = useRouter()

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const searchQueryRef = ref('')

  const handleSearchChange = () => {
    emit('search-change', searchQueryRef.value)
  }

  watch(searchQueryRef, handleSearchChange)

  const onClearSearch = () => {
    searchQueryRef.value = ''
  }

  const onBack = () => {
    router.back()
  }

  const onImportLocalSongs = async () => {
    if (window.electronAPI) {
      const file = await window.electronAPI.openFileDialog()
      if (file.filePaths.length > 0) {
        Loading.show()
        const results: ISong[] = await window.electronAPI.parseAudioMetadata(file.filePaths)
        storeManager.addSongs(results)
        Loading.hide()
      }
    }
  }

  const onImportLocalFolder = async () => {
    if (window.electronAPI) {
      const file = await window.electronAPI.openDirectoryDialog()
      if (file.filePaths.length > 0) {
        Loading.show()
        const results: ISong[] = await window.electronAPI.parseAudioMetadata(file.filePaths)
        storeManager.addSongs(results)
        Loading.hide()
      }
    }
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
        <button v-if="listKey === DefaultKey.Local" class="btn-batch" @click="onToggleBatch(false)">退出批量操作</button>
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
