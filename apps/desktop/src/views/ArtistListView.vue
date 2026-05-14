<script setup lang="ts">
  import { computed } from 'vue'
  import { IconEnum } from '@metatune/common'
  import type { IArtist } from '@metatune/common'
  import { getStoreManager } from '@/utils/storeManager'
  import IconBase from '@/components/base/IconBase.vue'
  import { useRouter } from 'vue-router'
  import { DefaultKey } from '@metatune/common'

  const router = useRouter()

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const artistList = computed(() => playerStore.artistLists)

  const onArtist = (item: IArtist) => {
    router.push('/artist/' + item.name)
    playerStore.currentViewKey = DefaultKey.Artist
    playerStore.currentArtistName = item.name
  }
</script>

<template>
  <section class="artist-list-view">
    <div class="artist-list-container">
      <div v-if="artistList.length > 0" class="artist-list">
        <div v-for="item in artistList" :key="item.name" class="artist-item" @click="onArtist(item)">
          <div class="artist-art">
            <img v-if="item.coverArt" :src="item.coverArt" :alt="item.name" class="artist-art-img" />
            <div v-else class="artist-art-placeholder">
              <IconBase>
                <component :is="IconEnum.User" />
              </IconBase>
            </div>
          </div>
          <div class="artist-info">
            <div class="artist-name">{{ item.name }}</div>
            <div class="artist-count">{{ `${item.songIds.length} 首` }}</div>
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
  .artist-list-view {
    width: 100%;
    height: 100%;

    .artist-list-container {
      width: 100%;
      height: 100%;

      .artist-list {
        width: 100%;
        height: 100%;
        overflow: auto;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        padding-right: 4px;

        .artist-item {
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

          .artist-art {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;

            .artist-art-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .artist-art-placeholder {
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

          .artist-info {
            .artist-name {
              font-size: 14px;
              line-height: 150%;
            }

            .artist-count {
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
