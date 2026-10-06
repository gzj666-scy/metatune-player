<script setup lang="ts">
  import { ref } from 'vue'
  import { IconEnum, formatTime } from '@metatune/common/utils'
  import IconBase from '@/components/base/IconBase.vue'
  import VolumeControl from '@/components/business/VolumeControl.vue'
  import { getPlayManager } from '@/utils/playManager'
  import { usePlayerControls } from '@/composables/usePlayerControls'

  const emit = defineEmits<{
    'toggle-player': [data: boolean]
  }>()

  const playManager = getPlayManager()

  const progressContainerRef = ref<HTMLDivElement>()

  // 进度/音量/播放模式/收藏等共享逻辑见 usePlayerControls
  const {
    song,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    progressPercent,
    volumeIcon,
    playModeIcon,
    playModeTitle,
    canGoPrev,
    canGoNext,
    isFavorite,
    progressDrag,
    onProgressClick,
    onPlayMode,
    onToggleMute,
    onToggleFavorite,
  } = usePlayerControls(progressContainerRef)

  // 音量弹层显隐（hover 按钮 300ms 延迟隐藏）
  const showVolumeControlRef = ref(false)
  const volumeControlStyleRef = ref<Record<string, string>>()
  const delayHideVolumeRef = ref<number>()

  function onVolumeMouseEnter(event: MouseEvent) {
    clearTimeout(delayHideVolumeRef.value)
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    volumeControlStyleRef.value = { left: rect.left + 'px', bottom: window.innerHeight - rect.top + 'px' }
    showVolumeControlRef.value = true
  }

  function onVolumeMouseLeave() {
    delayHideVolumeRef.value = window.setTimeout(() => {
      showVolumeControlRef.value = false
    }, 300)
  }

  function onVolumeControlMouseEnter() {
    clearTimeout(delayHideVolumeRef.value)
  }

  function onVolumeControlMouseLeave() {
    onVolumeMouseLeave()
  }

  function onVolumeChange(value: number) {
    playManager.setVolume(value)
  }
</script>

<template>
  <section class="player-status-bar">
    <!-- 进度条 -->
    <div class="progress-bar" ref="progressContainerRef" @click="onProgressClick">
      <div class="progress-track" :style="{ width: progressPercent + '%' }">
        <div class="progress-thumb" @mousedown="progressDrag.startDrag" @touchstart="progressDrag.startDrag"></div>
      </div>
    </div>
    <div class="controls-row">
      <!-- 左侧：歌曲信息 -->
      <div class="controls-left">
        <div class="album-art-mini" @click="$emit('toggle-player', true)">
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
        <VolumeControl
          v-if="showVolumeControlRef"
          :volume="volume"
          :style="volumeControlStyleRef"
          @change="onVolumeChange"
          @mouseenter="onVolumeControlMouseEnter"
          @mouseleave="onVolumeControlMouseLeave"
        />
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
        <button class="control-btn2" @click="$emit('toggle-player', true)" title="打开播放详情">
          <IconBase>
            <component :is="IconEnum.ChevronsUp" />
          </IconBase>
        </button>
      </div>
    </div>
  </section>
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
          box-shadow: 0 0 6px rgb(59 130 246 / 30%);

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
            background: rgb(0 0 0 / 50%);
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
