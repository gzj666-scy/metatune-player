<template>
  <div class="sidebar">
    <!-- 导航菜单 -->
    <nav class="nav-menu">
      <div class="menu-section">
        <div class="section-header">
          <div class="section-label">音乐库</div>
        </div>
        <ul class="menu-list">
          <li v-for="item in mainMenuItems" :key="item.id" :class="clsx('menu-item', { active: activeView === item.id })" @click="onChangeView(item)">
            <IconBase class="menu-icon">
              <component :is="activePlayListId === item.id ? IconEnum.Playing : item.iconNode" />
            </IconBase>
            <div class="menu-content">
              <span class="menu-text">{{ item.name }}</span>
              <span class="menu-count">{{ item.count }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- 歌单列表 -->
      <div class="menu-section">
        <div class="section-header playlist-header">
          <div class="playlist-label-box" @click="onExpandPlaylist">
            <IconBase :class="clsx('expand-playlist-icon', { active: expandPlaylistRef })">
              <component :is="IconEnum.ChevronDown" />
            </IconBase>
            <span class="section-label">歌单</span>
            <span class="section-count">{{ playerStore.currentPlaylists.length }}</span>
          </div>
          <button class="add-playlist-btn" @click="onAddPlaylist" title="新建歌单">
            <IconBase>
              <component :is="IconEnum.Plus" />
            </IconBase>
          </button>
        </div>
        <ul v-if="expandPlaylistRef" class="menu-list">
          <li
            v-for="item in playerStore.currentPlaylists"
            :key="item.createTime"
            :class="clsx('menu-item playlist-item', { active: activeView === item.createTime })"
            @click="onOpenPlaylist(item)"
            @contextmenu.prevent="onPlaylistRightClick(item.createTime, $event)"
          >
            <IconBase class="menu-icon">
              <component :is="activePlayListId === item.createTime ? IconEnum.Playing : IconEnum.ListMusic" />
            </IconBase>
            <div class="menu-content">
              <span class="menu-text">{{ item?.name }}</span>
              <span class="menu-count">{{ item.songIds.length }}</span>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { clsx, DefaultKey, IconEnum, MainMenuItems, PanelType, SortTypeItems } from '@metatune/common'
  import type { IMainMenuItem, IPlaylistItem } from '@metatune/common'
  import IconBase from '../base/IconBase.vue'
  import { Modal } from '@/utils/modal'
  import { getStoreManager } from '@/utils/storeManager'
  import { useRouter } from 'vue-router'

  const router = useRouter()

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const expandPlaylistRef = ref(false)

  const activeView = computed(() => playerStore.currentViewKey)
  const mainMenuItems = computed(() => {
    // 直接返回的 MainMenuItems 数组是外部定义的常量，不会触发响应式更新，改 forEach 为 map 返回新数组
    return MainMenuItems.map(v => {
      if (v.id === DefaultKey.Local) v.count = playerStore.songs.length
      if (v.id === DefaultKey.Favorite) v.count = playerStore.playlists[DefaultKey.Favorite]?.songIds?.length || 0
      if (v.id === DefaultKey.Artist) v.count = playerStore.artistLists?.length || 0
      if (v.id === DefaultKey.Album) v.count = playerStore.albumLists?.length || 0
      if (v.id === DefaultKey.Folder) v.count = playerStore.folderLists?.length || 0
      return v
    })
  })

  const activePlayListId = computed(() => {
    const id = playerStore.currentState.currentListId
    // return playerStore.defaultPlaylistKey.includes(id) ? '' : id
    return id
  })

  // const onChangeView = (view: Props['activeView']) => {
  //   emit('change-view', view)
  // }

  const onChangeView = (item: IMainMenuItem) => {
    router.replace(item.path)
    if (!([DefaultKey.Artist] as string[]).includes(item.id)) {
      playerStore.currentViewKey = item.id
    }
  }

  const onExpandPlaylist = () => {
    expandPlaylistRef.value = !expandPlaylistRef.value
  }

  const onAddPlaylist = async () => {
    const name = await Modal.prompt('新建歌单')
    if (name && name.trim()) {
      storeManager.addPlayList({
        name: name,
        songIds: [],
        createTime: Date.now() + '',
        sortType: SortTypeItems[0].value,
      })
    }
  }

  const onOpenPlaylist = (item: IPlaylistItem) => {
    router.replace('/playlist/' + item.createTime)
    playerStore.currentViewKey = item.createTime
  }

  const onPlaylistRightClick = (id: string, e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const windowHeight = window.innerHeight
    let style
    if (rect.top > windowHeight / 2) {
      style = {
        bottom: `${windowHeight - rect.bottom}px`,
        left: `${rect.left + (rect.width * 2) / 3}px`,
      }
    } else {
      style = {
        top: `${rect.top}px`,
        left: `${rect.left + (rect.width * 2) / 3}px`,
      }
    }
    playerStore.panel = { type: PanelType.PlaylistAction, data: { id, style } }
  }
</script>

<style scoped lang="scss">
  .sidebar {
    flex-shrink: 0;
    width: 180px;
    height: 100%;
    display: flex;
    flex-direction: column;

    .nav-menu {
      flex: 1;
      overflow-y: auto;
      padding: 10px 0 16px 0;

      .menu-section {
        margin-bottom: 24px;

        &:last-child {
          margin-bottom: 0;
        }

        .section-header {
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          margin-bottom: 8px;

          &.playlist-header {
            padding: 0 10px;
          }

          .section-label {
            font-size: 14px;
            color: var(--text-color-secondary);
            font-weight: 500;
          }

          .section-count {
            font-size: 12px;
            color: var(--text-color-secondary);
          }

          .playlist-label-box {
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;

            .expand-playlist-icon {
              width: 18px;
              color: var(--btn-primary-bg);
              transition: all 0.2s;
              transform: rotate(-90deg);

              &.active {
                transform: rotate(0deg);
              }
            }
          }

          .add-playlist-btn {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--btn-secondary-bg);
            color: var(--text-color-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            color: var(--btn-primary-bg);

            &:hover {
              // filter: brightness(2);
              color: var(--btn-primary-hover-bg);
            }

            svg {
              width: 14px;
            }
          }
        }

        .menu-list {
          list-style: none;
          padding: 0;
          margin: 0;

          .menu-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            color: var(--text-color-primary);
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
            gap: 12px;
            border-radius: 6px;

            .menu-icon {
              width: 16px;
              flex-shrink: 0;
            }

            &:hover {
              background: rgba(0, 102, 204, 0.05);
            }

            &.active {
              background: rgba(0, 102, 204, 0.15);
              color: var(--active-text-color-primary);
            }

            &.playing:not(.active) {
              background: rgba(0, 102, 204, 0.05);
            }

            &.playlist-item {
              padding: 8px 12px 8px 22px;
            }

            .menu-content {
              flex-grow: 1;
              min-width: 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 8px;

              .menu-text {
                font-size: 14px;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex-grow: 1;
              }

              .menu-count {
                font-size: 12px;
                color: var(--text-color-secondary);
                flex-shrink: 0;
              }
            }
          }
        }
      }
    }
  }
</style>
