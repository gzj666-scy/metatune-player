<script setup lang="ts">
  import { computed } from 'vue'
  import { IconEnum } from '@metatune/common'
  import type { IAlbum } from '@metatune/common'
  import { getStoreManager } from '@/utils/storeManager'
  import IconBase from '@/components/base/IconBase.vue'
  import { useRouter } from 'vue-router'
  import { DefaultKey } from '@metatune/common'

  const router = useRouter()

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const albumList = computed(() => playerStore.albumLists)

  const onArtist = (item: IAlbum) => {
    router.push('/album/' + item.key)
    playerStore.currentViewKey = DefaultKey.Album
    playerStore.currentAlbumName = item.key
  }
</script>

<template>
  <div class="album-list-view">
    <div class="album-list-container">
      <div v-if="albumList.length > 0" class="album-list">
        <div v-for="item in albumList" :key="item.name" class="album-item" @click="onArtist(item)">
          <div class="album-art">
            <img v-if="item.coverArt" :src="item.coverArt" :alt="item.name" class="album-art-img" />
            <div v-else class="album-art-placeholder">
              <IconBase>
                <component :is="IconEnum.Disc" />
              </IconBase>
            </div>
          </div>
          <div class="album-info">
            <div class="album-name">{{ item.name }}</div>
            <div class="album-count">{{ `${item.songIds.length} 首 ${item.artist}` }}</div>
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
  </div>
</template>

<style scoped lang="scss">
  .album-list-view {
    width: 100%;
    height: 100%;

    .album-list-container {
      width: 100%;
      height: 100%;

      .album-list {
        width: 100%;
        height: 100%;
        overflow: auto;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        padding-right: 4px;

        .album-item {
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

          .album-art {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;

            .album-art-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .album-art-placeholder {
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

          .album-info {
            .album-name {
              font-size: 14px;
              line-height: 150%;
            }

            .album-count {
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
