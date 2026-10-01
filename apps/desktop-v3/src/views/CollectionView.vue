<script setup lang="ts">
  import { computed } from 'vue'
  import { DefaultKey, IconEnum } from '@metatune/common-v3'
  import { getStoreManager } from '@/utils/storeManager'
  import IconBase from '@/components/base/IconBase.vue'
  import { useRouter } from 'vue-router'

  /**
   * v3：歌手/专辑/文件夹三个列表视图合并为通用集合视图，
   * 由 kind 区分数据源与跳转行为，UI 与原版保持一致。
   */
  type CollectionKind = 'artist' | 'album' | 'folder'

  const props = defineProps<{ kind: CollectionKind }>()

  const router = useRouter()

  const storeManager = getStoreManager()
  const { playerStore } = storeManager

  interface ICollectionItem {
    key: string
    name: string
    songIds: string[]
    coverArt?: string
    /** 专辑视图附加的歌手名 */
    artist?: string
  }
  const list = computed<ICollectionItem[]>(() => {
    // 歌手/文件夹视图的数据源（IArtist）没有 key 字段，统一补上
    if (props.kind === 'artist') return playerStore.artistLists.map(v => ({ ...v, key: v.name }))
    if (props.kind === 'album') return playerStore.albumLists
    return playerStore.folderLists.map(v => ({ ...v, key: v.name }))
  })

  const config = computed(() => {
    switch (props.kind) {
      case 'artist':
        return { icon: IconEnum.User, route: '/artist/', viewKey: DefaultKey.Artist, selectedKey: playerStore.currentArtistName }
      case 'album':
        return { icon: IconEnum.Disc, route: '/album/', viewKey: DefaultKey.Album, selectedKey: playerStore.currentAlbumName }
      default:
        return { icon: IconEnum.Folder, route: '/folder/', viewKey: DefaultKey.Folder, selectedKey: playerStore.currentFolderName }
    }
  })

  function onSelect(item: ICollectionItem) {
    router.push(config.value.route + encodeURIComponent(item.key))
    playerStore.currentViewKey = config.value.viewKey
    if (props.kind === 'artist') playerStore.currentArtistName = item.name
    else if (props.kind === 'album') playerStore.currentAlbumName = item.key
    else playerStore.currentFolderName = item.name
  }
</script>

<template>
  <section class="collection-list-view">
    <div class="collection-list-container">
      <div v-if="list.length > 0" class="collection-list">
        <div
          v-for="item in list"
          :key="item.key"
          class="collection-item"
          :class="{ selected: config.selectedKey === item.key }"
          @click="onSelect(item)"
        >
          <div class="collection-art">
            <img v-if="item.coverArt" :src="item.coverArt" :alt="item.name" class="collection-art-img" />
            <div v-else class="collection-art-placeholder">
              <IconBase>
                <component :is="config.icon" />
              </IconBase>
            </div>
          </div>
          <div class="collection-info">
            <div class="collection-name">{{ item.name }}</div>
            <div class="collection-count">
              {{ kind === 'album' ? `${item.songIds.length} 首 ${item.artist}` : `${item.songIds.length} 首` }}
            </div>
          </div>
        </div>
      </div>
      <div v-else class="list-empty">
        <IconBase>
          <component :is="IconEnum.Empty" />
        </IconBase>
        <span>空空如也</span>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
  .collection-list-view {
    width: 100%;
    height: 100%;

    .collection-list-container {
      width: 100%;
      height: 100%;

      .collection-list {
        width: 100%;
        height: 100%;
        overflow: auto;
        display: flex;
        justify-content: space-between;
        align-content: flex-start;
        flex-wrap: wrap;
        padding-right: 4px;

        .collection-item {
          width: 49%;
          display: flex;
          align-items: center;
          gap: 15px;
          cursor: pointer;
          padding: 8px 10px;
          border-radius: 6px;

          &:hover {
            background: var(--item-hover-bg);
          }

          &.selected {
            background: var(--item-selected-bg);
          }

          .collection-art {
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;

            .collection-art-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .collection-art-placeholder {
              width: 100%;
              height: 100%;
              background: var(--album-art-bg);
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: var(--text-color-primary);
            }
          }

          .collection-info {
            .collection-name {
              font-size: 14px;
              line-height: 150%;
            }

            .collection-count {
              font-size: 10px;
              line-height: 130%;
            }
          }
        }
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
  }
</style>
