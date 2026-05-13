<script setup lang="ts">
  import { ref, computed, onUnmounted, StyleValue } from 'vue'
  import { PlayMode, DefaultVolume, IconEnum, DefaultKey } from '@metatune/common'
  import IconBase from '@/components/base/IconBase.vue'
  import { getStoreManager } from '@/utils/storeManager'
  import { getPlayManager } from '@/utils/playManager'

  const emit = defineEmits<{
    'open-player': []
  }>()

  const playManager = getPlayManager()
  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const isDraggingRef = ref(false)
  const dragTimeRef = ref(0)
  const progressContainerRef = ref<HTMLDivElement>()
  const isVolumeDraggingRef = ref(false)
  const showVolumeControlRef = ref(false)
  const volumeControlStyleRef = ref<StyleValue>()
  const volumeSliderRef = ref<HTMLDivElement>()
  const delayHideVolumeRef = ref()

  const song = computed(() => playerStore.currentSong)
  const isPlaying = computed(() => playerStore.currentState.isPlaying)
  const currentTime = computed(() => {
    if (isDraggingRef.value) return dragTimeRef.value
    return playerStore.currentState.currentTime
  })
  const duration = computed(() => {
    if (song.value) return song.value.duration || 0
    return 0
  })
  const playMode = computed(() => playerStore.currentState.playMode)
  const isMuted = computed(() => playerStore.currentState.isMuted)
  const volume = computed(() => playerStore.currentState.volume)
  const progressPercent = computed(() => {
    if (!duration.value || duration.value <= 0) return 0
    return Math.min((currentTime.value / duration.value) * 100, 100)
  })
  const volumeIcon = computed(() => {
    if (isMuted.value) return IconEnum.VolumeX
    if (volume.value <= 0) return IconEnum.Volume
    if (volume.value <= DefaultVolume) return IconEnum.Volume1
    return IconEnum.Volume2
    // if (isMuted.value) return '🔇'
    // if (localVolume.value < 30) return '🔈'
    // if (localVolume.value < 70) return '🔉'
    // return '🔊'
  })
  const playModeIcon = computed(() => {
    switch (playMode.value) {
      case PlayMode.SHUFFLE:
        return IconEnum.Shuffle
      case PlayMode.REPEAT_ONE:
        return IconEnum.Repeat1
      // case PlayMode.SEQUENCE:
      //   return IconEnum.Repeat
      default:
        return IconEnum.Repeat
    }

    // case "list-loop":
    //     return "🔁";
    // case "single-loop":
    //     return "🔂";
    // case "random":
    //     return "🔀";
    // default:
    //     return "▶";
  })
  const playModeTitle = computed(() => {
    switch (playMode.value) {
      case PlayMode.SHUFFLE:
        return '随机播放'
      case PlayMode.REPEAT_ONE:
        return '单曲循环'
      // case PlayMode.SEQUENCE:
      //   return '顺序播放'
      default:
        return '列表循环'
    }
  })
  const canGoPrev = computed(() => playerStore.canGoPrev)
  const canGoNext = computed(() => playerStore.canGoNext)
  const isFavorite = computed(() => {
    const playlist = playerStore.playlists[DefaultKey.Favorite]
    if (playlist?.songIds) return playlist.songIds.includes(song.value?.uid || '')
    return false
  })

  const onProgressClick = (event: MouseEvent) => {
    if (!duration.value || duration.value <= 0) return
    if (isDraggingRef.value) return
    const progressBar = event.currentTarget as HTMLElement
    const rect = progressBar.getBoundingClientRect()
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width))
    const percentage = (x / rect.width) * 100
    const time = (percentage / 100) * duration.value
    playManager.seekTo(time)
  }

  const onProgressDrag = (event: MouseEvent | TouchEvent) => {
    if (!duration.value || duration.value <= 0) return
    const progressBar = progressContainerRef.value
    if (!progressBar) return
    dragTimeRef.value = currentTime.value
    isDraggingRef.value = true

    const rect = progressBar.getBoundingClientRect()
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.value) return

      let clientX: number

      if ('touches' in moveEvent) {
        clientX = moveEvent.touches[0].clientX
      } else {
        clientX = moveEvent.clientX
      }

      const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
      const percentage = (x / rect.width) * 100
      dragTimeRef.value = (percentage / 100) * duration.value
    }

    const handleEnd = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
      if (dragTimeRef.value >= 0) playManager.seekTo(dragTimeRef.value)
      isDraggingRef.value = false
      dragTimeRef.value = 0
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('touchend', handleEnd)

    event.preventDefault()
  }

  const onPlayMode = () => {
    const modes: Array<PlayMode> = [PlayMode.REPEAT_ALL, PlayMode.SHUFFLE, PlayMode.REPEAT_ONE]
    const currentIndex = modes.indexOf(playMode.value)
    const nextIndex = (currentIndex + 1) % modes.length
    playManager.setPlayMode(modes[nextIndex])
  }

  const onToggleMute = () => {
    playManager.toggleMute(!isMuted.value)
  }

  const onVolumeMouseEnter = (event: MouseEvent) => {
    clearTimeout(delayHideVolumeRef.value)
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    volumeControlStyleRef.value = { left: rect.left + 'px', bottom: window.innerHeight - rect.top + 'px' }
    showVolumeControlRef.value = true
  }

  const onVolumeMouseLeave = () => {
    delayHideVolumeRef.value = setTimeout(() => {
      showVolumeControlRef.value = false
    }, 300)
  }

  const onVolumeControlMouseEnter = () => {
    clearTimeout(delayHideVolumeRef.value)
  }

  const onVolumeControlMouseLeave = () => {
    delayHideVolumeRef.value = setTimeout(() => {
      showVolumeControlRef.value = false
    }, 300)
  }

  const onVolumeClick = (event: MouseEvent) => {
    if (isVolumeDraggingRef.value) return
    const volumeSlider = event.currentTarget as HTMLElement
    const rect = volumeSlider.getBoundingClientRect()
    const y = Math.max(0, Math.min(rect.bottom - event.clientY, rect.height))
    const percentage = Math.round((y / rect.height) * 100)
    const volume = Math.max(0, Math.min(percentage, 100))
    playManager.setVolume(volume)
  }

  const onVolumeDrag = (event: MouseEvent | TouchEvent) => {
    const volumeSlider = volumeSliderRef.value
    if (!volumeSlider) return
    isVolumeDraggingRef.value = true

    const rect = volumeSlider.getBoundingClientRect()
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isVolumeDraggingRef.value) return

      let clientY: number

      if ('touches' in moveEvent) {
        clientY = moveEvent.touches[0].clientY
      } else {
        clientY = moveEvent.clientY
      }

      const y = Math.max(0, Math.min(rect.bottom - clientY, rect.height))
      const percentage = Math.round((y / rect.height) * 100)
      const volume = Math.max(0, Math.min(percentage, 100))
      playManager.setVolume(volume)
    }

    const handleEnd = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
      isVolumeDraggingRef.value = false
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('touchend', handleEnd)

    event.preventDefault()
  }

  const onToggleFavorite = () => {
    if (song.value?.uid) {
      storeManager.updateFavorite([song.value.uid], !isFavorite.value)
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  onUnmounted(() => {
    clearTimeout(delayHideVolumeRef.value)
  })
</script>

<template>
  <div class="player-status-bar">
    <!-- 进度条 -->
    <div class="progress-bar" ref="progressContainerRef" @click="onProgressClick">
      <div class="progress-track" :style="{ width: progressPercent + '%' }">
        <div class="progress-thumb" @mousedown="onProgressDrag" @touchstart="onProgressDrag"></div>
      </div>
    </div>
    <div class="controls-row">
      <!-- 左侧：歌曲信息 -->
      <div class="controls-left">
        <div class="album-art-mini" @click="$emit('open-player')">
          <img v-if="song?.albumArt" :src="song.albumArt" :alt="song.album" class="album-art-img" />
          <div v-else class="album-art-placeholder">
            <IconBase>
              <component :is="IconEnum.Music" />
            </IconBase>
          </div>
          <div v-if="isPlaying" class="playing-indicator">
            <div class="playing-wave">
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
            </div>
          </div>
        </div>
        <div class="song-info">
          <div class="song-title">{{ song?.title }}</div>
          <div class="song-artist">{{ song?.artist }}</div>
        </div>
      </div>

      <!-- 中间：播放控制 -->
      <div class="controls-center">
        <div class="playback-controls">
          <button class="control-btn" @click="onPlayMode" :title="playModeTitle">
            <IconBase>
              <component :is="playModeIcon" />
            </IconBase>
          </button>

          <button class="control-btn" @click="playManager.playPrev()" :disabled="!canGoPrev" title="上一首">
            <IconBase>
              <component :is="IconEnum.SkipBack" />
            </IconBase>
          </button>

          <button class="play-pause-btn" @click="playManager.togglePlayPause()" :title="isPlaying ? '暂停' : '播放'">
            <IconBase>
              <component :is="isPlaying ? IconEnum.Pause : IconEnum.Play" />
            </IconBase>
          </button>

          <button class="control-btn" @click="playManager.playNext()" :disabled="!canGoNext" title="下一首">
            <IconBase>
              <component :is="IconEnum.SkipForward" />
            </IconBase>
          </button>

          <button
            class="control-btn"
            @click="onToggleMute"
            @mouseenter="onVolumeMouseEnter"
            @mouseleave="onVolumeMouseLeave"
            :title="isMuted ? '取消静音' : '静音'"
          >
            <IconBase>
              <component :is="volumeIcon" />
            </IconBase>
          </button>
        </div>

        <!-- 音量控制（桌面端） -->
        <div
          v-if="showVolumeControlRef"
          class="volume-control"
          :style="volumeControlStyleRef"
          @mouseenter="onVolumeControlMouseEnter"
          @mouseleave="onVolumeControlMouseLeave"
        >
          <div class="volume-slider" ref="volumeSliderRef" @click="onVolumeClick">
            <div class="volume-track" :style="{ height: volume + '%' }"></div>
            <div class="volume-thumb" :style="{ bottom: volume + '%' }" @mousedown="onVolumeDrag" @touchstart="onVolumeDrag"></div>
          </div>
          <div class="volume-label">{{ volume }}</div>
        </div>
      </div>

      <!-- 右侧：附加控制 -->
      <div class="controls-right">
        <div class="time-display">{{ `${formatTime(currentTime)} / ${formatTime(duration)}` }}</div>
        <button class="control-btn2" :class="{ favorited: isFavorite }" @click="onToggleFavorite" :title="isFavorite ? '取消收藏' : '收藏'">
          <IconBase>
            <component :is="isFavorite ? IconEnum.HeartFilled : IconEnum.Heart" />
          </IconBase>
        </button>
        <!-- 播放器视图切换 -->
        <button class="control-btn2" @click="$emit('open-player')" title="打开播放详情">
          <IconBase>
            <component :is="IconEnum.ChevronsUp" />
          </IconBase>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .player-status-bar {
    flex-shrink: 0;
    width: 100%;
    backdrop-filter: var(--footer-blur);
    background: var(--footer-bg);
    box-shadow: var(--footer-shadow);
    display: flex;
    flex-direction: column;
    overflow-x: clip;

    .progress-bar {
      height: 3px;
      background: var(--progress-track-bg);
      cursor: pointer;
      flex-shrink: 0;

      .progress-track {
        height: 100%;
        background: var(--progress-track-fill);
        position: relative;

        .progress-thumb {
          position: absolute;
          top: 50%;
          right: -5px;
          transform: translateY(-50%);
          width: 10px;
          height: 10px;
          background: var(--progress-thumb-color);
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(59, 130, 246, 0.3);

          &:active {
            cursor: grabbing;
          }
        }
      }
    }

    .controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 20px;
      height: 65px;

      .controls-left {
        display: flex;
        gap: 12px;
        min-width: 200px;
        flex: 1;

        .album-art-mini {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 4px;
          overflow: hidden;
          flex-shrink: 0;
          cursor: pointer;

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

          .playing-indicator {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;

            .playing-wave {
              display: flex;
              align-items: center;
              height: 20px;
              gap: 2px;

              .wave-bar {
                width: 2px;
                height: 6px;
                background: white;
                border-radius: 1px;
                animation: waveAnimation 1s infinite ease-in-out;

                &:nth-child(1) {
                  animation-delay: 0s;
                }
                &:nth-child(2) {
                  animation-delay: 0.1s;
                }
                &:nth-child(3) {
                  animation-delay: 0.2s;
                }
                &:nth-child(4) {
                  animation-delay: 0.3s;
                }
              }

              @keyframes waveAnimation {
                0%,
                100% {
                  height: 6px;
                }
                50% {
                  height: 16px;
                }
              }
            }
          }
        }

        .song-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;

          .song-title {
            font-size: 14px;
            font-weight: 500;
            color: var(--footer-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .song-artist {
            font-size: 12px;
            color: var(--footer-text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }

      .controls-center {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        flex: 2;
        max-width: 400px;
        min-width: 300px;
        position: relative;

        .playback-controls {
          display: flex;
          align-items: center;
          gap: 8px;

          .control-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            color: var(--btn-primary-bg);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            position: relative;

            &:hover:not(:disabled) {
              color: var(--btn-primary-hover-bg);
            }

            &:disabled {
              opacity: 0.3;
              cursor: not-allowed;
            }
          }

          .play-pause-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--btn-primary-bg);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;

            &:hover {
              background: var(--btn-primary-hover-bg);
            }
          }
        }

        .volume-control {
          position: fixed;
          width: 36px;
          height: 120px;
          padding: 10px 6px 4px;
          border-radius: 4px;
          background: var(--modal-bg);
          // backdrop-filter: blur(10px);
          box-shadow: var(--modal-shadow);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;

          .volume-slider {
            width: 4px;
            height: 80px;
            background: var(--progress-track-bg);
            border-radius: 2px;
            cursor: pointer;
            position: relative;

            .volume-track {
              background: var(--progress-track-fill);
              position: absolute;
              bottom: 0;
              left: 0;
              width: 100%;
              border-radius: 2px;
            }

            .volume-thumb {
              background: var(--progress-thumb-color);
              position: absolute;
              left: 50%;
              transform: translate(-50%, 50%);
              width: 12px;
              height: 12px;
              border-radius: 50%;
            }
          }

          .volume-label {
            font-size: 14px;
            color: var(--text-color-primary);
          }
        }
      }

      .controls-right {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 150px;
        flex: 1;
        justify-content: flex-end;

        .time-display {
          font-size: 12px;
          color: var(--text-color-primary);
        }

        .control-btn2 {
          color: var(--text-color-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;

          &.favorited {
            color: red;
          }

          &:hover:not(.favorited) {
            filter: brightness(0.5);
          }
        }
      }
    }
  }
</style>
