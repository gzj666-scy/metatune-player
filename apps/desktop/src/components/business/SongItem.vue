<template>
  <div :key="song.uid" class="song-item" :class="{ selected: selected, isCurPlaying: isCurPlaying }" :data-song-id="song.uid" ref="rootRef">
    <div class="cell-checkbox">
      <input v-if="isBatch" type="checkbox" :checked="selected" @click.stop @change="onSelect(song.uid)" />
      <span v-else>{{ index + 1 }}</span>
    </div>
    <div class="cell-title">
      <div class="album-art">
        <img v-if="song.albumArt" :src="song.albumArt" :alt="song.album" class="album-art-img" />
        <div v-else class="album-art-placeholder">
          <IconBase>
            <component :is="IconEnum.Music" />
          </IconBase>
        </div>
      </div>
      <div class="song-info">
        <div class="song-name">{{ song.title }}</div>
        <div class="song-sub-info">
          <div class="artist-name">{{ song.artist }}</div>
          <span v-if="song.qualityFlag" :class="`quality-badge ${song.qualityFlag?.toLowerCase()}`">
            {{ song.qualityFlag }}
          </span>
        </div>
      </div>
    </div>
    <div class="cell-album">{{ song.album }}</div>
    <div class="cell-duration">{{ formatDuration(song.duration) }}</div>
    <div class="cell-actions">
      <button class="action-btn" :title="playing ? '正在播放' : '播放'" @click="onPlay(song.uid)">
        <IconBase v-if="playing">
          <component :is="IconEnum.Pause" />
        </IconBase>
        <IconBase v-else>
          <component :is="IconEnum.Play" />
        </IconBase>
      </button>

      <button class="action-btn" title="更多操作" @click.stop="onOpenActionMenu">
        <IconBase>
          <component :is="IconEnum.EllipsisVertical" />
        </IconBase>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, inject, ref } from 'vue'
  import { IconEnum, PanelType } from '@metatune/common'
  import type { ISong } from '@metatune/common'
  import IconBase from '@/components/base/IconBase.vue'
  import { getStoreManager } from '@/utils/storeManager'

  interface Props {
    index: number
    song: ISong
    isBatch: boolean
    selected: boolean
    listKey: string
    onSelect: (songId: string) => void
  }

  const props = defineProps<Props>()

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const rootRef = ref<HTMLElement>()
  defineExpose({
    $el: rootRef,
  })

  const isCurPlaying = computed(() => {
    return playerStore.currentState.currentSongId === props.song.uid
  })
  const playing = computed(() => {
    if (isCurPlaying.value && playerStore.currentState.isPlaying) return true
    return false
  })

  const playSong = inject('play-song') as (id: string, listKey: string) => void
  const togglePlay = inject('toggle-play') as (listKey: string) => void

  const onOpenActionMenu = (e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const windowHeight = window.innerHeight
    const windowWidth = window.innerWidth
    let style
    if (rect.top > windowHeight / 2) {
      style = {
        bottom: `${windowHeight - rect.bottom}px`,
        right: `${windowWidth - rect.left}px`,
      }
    } else {
      style = {
        top: `${rect.top}px`,
        right: `${windowWidth - rect.left}px`,
      }
    }
    playerStore.panel = { type: PanelType.SongAction, data: { song: props.song, listKey: props.listKey, style } }
  }

  const onPlay = (songId: string) => {
    if (isCurPlaying.value) {
      togglePlay(props.listKey)
    } else {
      playSong(songId, props.listKey)
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
</script>

<style scoped lang="scss">
  .song-item {
    display: grid;
    grid-template-columns: 50px 1fr 1fr 100px 70px;
    padding: 8px 8px 8px;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 6px;

    &:hover {
      background: var(--item-hover-bg);
    }

    &.selected {
      background: var(--item-selected-bg);
    }

    &.isCurPlaying {
      background: var(--active-item-bg);

      .song-name,
      .cell-album {
        color: var(--active-text-primary) !important;
      }

      .artist-name {
        color: var(--active-text-secondary) !important;
      }
    }

    .cell-checkbox {
      display: flex;
      align-items: center;
      justify-content: center;
      padding-right: 10px;

      span {
        font-size: 12px;
        line-height: 120%;
      }

      input {
        width: 14px;
        height: 14px;
      }
    }

    .cell-title {
      display: flex;
      gap: 12px;
      overflow: hidden;
      padding-right: 10px;

      .album-art {
        width: 45px;
        height: 45px;
        flex-shrink: 0;

        .album-art-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4px;
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

      .song-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;

        .song-name {
          font-size: 16px;
          font-weight: 500;
          line-height: 120%;
          color: var(--text-color-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .song-sub-info {
          display: flex;
          align-items: center;
          gap: 6px;

          .artist-name {
            font-size: 14px;
            line-height: 120%;
            color: var(--text-color-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .quality-badge {
            display: inline-flex;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: 500;
            line-height: 120%;
            text-transform: uppercase;

            &.hq {
              background: #4caf4fa4;
              color: white;
            }

            &.sq {
              background: #9436f997;
              color: white;
            }

            &.hr {
              background: #e69806ca;
              color: white;
            }
          }
        }
      }
    }

    .cell-album {
      padding-left: 10px;
      font-size: 14px;
      font-weight: 500;
      line-height: 120%;
      color: var(--text-color-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cell-duration {
      padding-left: 20px;
      font-size: 12px;
      font-weight: 500;
      line-height: 120%;
      color: var(--text-color-secondary);
    }

    .cell-actions {
      display: flex;
      gap: 4px;
      justify-content: flex-end;

      .action-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        color: var(--text-color-secondary);
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          filter: brightness(0.5);
        }
      }
    }
  }
</style>
