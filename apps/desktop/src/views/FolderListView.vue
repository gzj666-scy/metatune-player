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

  const folderList = computed(() => playerStore.folderLists)

  const onArtist = (item: IArtist) => {
    router.push('/folder/' + item.name)
    playerStore.currentViewKey = DefaultKey.Folder
    playerStore.currentFolderName = item.name
  }
</script>

<template>
  <section class="folder-list-view">
    <div class="folder-list-container">
      <div v-if="folderList.length > 0" class="folder-list">
        <div
          v-for="item in folderList"
          :key="item.name"
          class="folder-item"
          :class="{ selected: playerStore.currentFolderName === item.name }"
          @click="onArtist(item)"
        >
          <div class="folder-art">
            <img v-if="item.coverArt" :src="item.coverArt" :alt="item.name" class="folder-art-img" />
            <div v-else class="folder-art-placeholder">
              <IconBase>
                <component :is="IconEnum.Folder" />
              </IconBase>
            </div>
          </div>
          <div class="folder-info">
            <div class="folder-name">{{ item.name }}</div>
            <div class="folder-count">{{ `${item.songIds.length} 首` }}</div>
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
  .folder-list-view {
    width: 100%;
    height: 100%;

    .folder-list-container {
      width: 100%;
      height: 100%;

      .folder-list {
        width: 100%;
        height: 100%;
        overflow: auto;
        display: flex;
        justify-content: space-between;
        align-content: flex-start;
        flex-wrap: wrap;
        padding-right: 4px;

        .folder-item {
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

          .folder-art {
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;

            .folder-art-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .folder-art-placeholder {
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

          .folder-info {
            .folder-name {
              font-size: 14px;
              line-height: 150%;
            }

            .folder-count {
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
