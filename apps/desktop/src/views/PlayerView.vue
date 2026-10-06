<script setup lang="ts">
  import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
  import { DynamicColorAdjuster, IconEnum, PanelEnum, formatTime } from '@metatune/common/utils'
  import IconBase from '@/components/base/IconBase.vue'
  import VolumeControl from '@/components/business/VolumeControl.vue'
  import { getPlayManager } from '@/utils/playManager'
  import { getStoreManager } from '@/utils/storeManager'
  import PlayerLyric from '@/components/business/PlayerLyric.vue'
  import TitleBar from '@/components/layout/TitleBar.vue'
  import { useSpectrum } from '@/composables/useSpectrum'
  import { usePlayerControls } from '@/composables/usePlayerControls'

  interface Props {
    show?: boolean
  }

  withDefaults(defineProps<Props>(), {
    show: false,
  })

  const emit = defineEmits<{
    'toggle-player': [data: boolean]
    'load-lyrics': []
  }>()

  const playManager = getPlayManager()

  const progressContainerRef = ref<HTMLDivElement>()

  // 进度/音量/播放模式/收藏等共享逻辑见 usePlayerControls
  const {
    isDraggingRef,
    song,
    isPlaying,
    currentTime,
    duration,
    volume,
    progressPercent,
    playModeTitle,
    playModeIcon,
    volumeIcon,
    isMuted,
    isFavorite,
    canGoPrev,
    canGoNext,
    progressDrag,
    onProgressClick,
    onPlayMode,
    onToggleMute,
    onToggleFavorite,
  } = usePlayerControls(progressContainerRef)

  const playerStore = getStoreManager().playerStore

  const themeVarsRef = ref<Record<string, string>>({})

  // 音量弹层显隐（hover 按钮 300ms 延迟隐藏）
  const showVolumeControlRef = ref(false)
  const volumeControlStyleRef = ref<Record<string, string>>()
  const delayHideVolumeRef = ref<number>()

  /** 频谱可视化（逻辑见 useSpectrum） */
  const canvasRef = ref<HTMLCanvasElement>()
  const settings = computed(() => playerStore.settings)
  const spectrum = useSpectrum({
    canvasRef,
    getData: () => playManager.getVisualizationData(),
    enabledRef: computed(() => settings.value.openVisualization),
    isPlayingRef: isPlaying,
    themeVarsRef: themeVarsRef,
  })

  function onShowMoreActions(e: MouseEvent) {
    if (!song.value) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const windowHeight = window.innerHeight
    const windowWidth = window.innerWidth
    let style
    if (rect.top > windowHeight / 2) {
      style = {
        bottom: `${windowHeight - rect.top + 5}px`,
        right: `${windowWidth - rect.left - 10}px`,
      }
    } else {
      style = {
        top: `${rect.top}px`,
        right: `${windowWidth - rect.left}px`,
      }
    }
    playerStore.panel = { type: PanelEnum.SongAction, data: { song: song.value, listKey: playerStore.currentState.currentListId, style } }
  }

  function onLoadExternalLyrics() {
    emit('load-lyrics')
  }

  function onSeekToLyric(time: number) {
    playManager.seekTo(time)
  }

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

  // 播放状态驱动频谱启停
  function initPlayerEvent() {
    const player = playManager.getPlayer()
    if (!player) return
    player.on('play', () => spectrum.start())
    player.on('pause', () => spectrum.stop())
    player.on('stop', () => spectrum.stop())
  }

  // 开关可视化设置
  watch(
    () => settings.value.openVisualization,
    newVal => {
      if (newVal) spectrum.start()
      else spectrum.clearCanvas()
    }
  )

  // 歌曲变化：清空频谱、更新主题色与窗口标题
  watch(
    () => song.value,
    async newSong => {
      if (newSong) {
        spectrum.clearCanvas()
        const cssObject = await DynamicColorAdjuster.getThemeCSSFromDominantColor(newSong.albumArt)
        themeVarsRef.value = cssObject

        window.electronAPI?.setWindowTitle(`${newSong.artist} - ${newSong.title}`)
      }
    }
  )

  onMounted(() => {
    initPlayerEvent()
  })

  onUnmounted(() => {
    clearTimeout(delayHideVolumeRef.value)
  })
</script>

<template>
  <Transition name="player-ani" appear>
    <section v-if="show" class="player-view" :style="{ ...themeVarsRef }">
      <!-- 背景模糊效果 -->
      <div v-if="song?.albumArt" class="player-background">
        <img :src="song.albumArt" alt="" class="background-image" />
        <div class="background-overlay"></div>
      </div>

      <!-- 顶部控制栏 -->
      <TitleBar
        :style="{ position: 'absolute', zIndex: 3, '--titlebar-btn-color': themeVarsRef['--player-highlight'] }"
        :in-player="true"
        @toggle-player="$emit('toggle-player', false)"
      />

      <!-- 播放器内容 -->
      <div class="player-content">
        <div class="player-header">
          <div class="song-title-header">{{ song?.title || '--' }}</div>
          <div class="song-artist-header">{{ song ? song.artist || '<未知>' : '--' }}</div>
        </div>

        <div class="player-body">
          <!-- 专辑封面区域 -->
          <div class="album-section">
            <div class="album-art-wrapper">
              <div v-if="song?.albumArt" class="album-art-container">
                <img :src="song.albumArt" :alt="song.album" class="album-art-large" />
              </div>
              <div v-else class="album-art-placeholder-large">
                <IconBase class="icon-music-large">
                  <component :is="IconEnum.Music" />
                </IconBase>
              </div>
            </div>

            <!-- 歌曲信息 -->
            <div class="song-info-expanded">
              <div class="song-album-expanded">{{ song ? song.album || '<未知>' : '--' }}</div>

              <!-- 音质信息 -->
              <div v-if="song" class="quality-tags">
                <div v-if="song.qualityFlag" class="quality-tag">{{ song.qualityFlag }}</div>

                <div v-if="song.bitsPerSample" class="quality-tag">{{ song.bitsPerSample }}bit</div>

                <div v-if="song.sampleRate" class="quality-tag">{{ song.sampleRate / 1000 }}kHz</div>

                <div v-if="song.bitrate" class="quality-tag">{{ Math.floor(song.bitrate / 1000) }}kbps</div>
              </div>
            </div>
          </div>

          <!-- 歌词区域 -->
          <div class="lyrics-section">
            <PlayerLyric
              :song="song"
              :currentTime="currentTime"
              :isDragging="isDraggingRef"
              @seek="onSeekToLyric"
              @load="onLoadExternalLyrics"
            />
          </div>
        </div>

        <div class="player-footer">
          <div class="progress-display">
            <div class="time-display">{{ formatTime(currentTime) }}</div>
            <div class="progress-wrapper">
              <!-- 可视化动画 -->
              <div class="visualizer-wrapper">
                <canvas ref="canvasRef"></canvas>
              </div>
              <!-- 进度控制 -->
              <div class="progress-bar-large" ref="progressContainerRef" @click="onProgressClick">
                <div class="progress-track-large" :style="{ width: progressPercent + '%' }">
                  <div class="progress-thumb-large" @mousedown="progressDrag.startDrag" @touchstart="progressDrag.startDrag"></div>
                </div>
              </div>
            </div>
            <div class="time-display">{{ formatTime(duration) }}</div>
          </div>

          <div class="playback-actions">
            <!-- 占位 -->
            <div class="song-actions"></div>
            <!-- 播放控制 -->
            <div class="playback-controls-large">
              <button class="control-btn-large" @click="onPlayMode" :title="playModeTitle">
                <IconBase>
                  <component :is="playModeIcon" />
                </IconBase>
              </button>

              <button class="control-btn-large" @click="playManager.playPrev()" :disabled="!canGoPrev" title="上一首">
                <IconBase>
                  <component :is="IconEnum.SkipBack" />
                </IconBase>
              </button>

              <button class="play-pause-btn-large" @click="playManager.togglePlayPause()" :title="isPlaying ? '暂停' : '播放'">
                <IconBase>
                  <component :is="isPlaying ? IconEnum.Pause : IconEnum.Play" />
                </IconBase>
              </button>

              <button class="control-btn-large" @click="playManager.playNext()" :disabled="!canGoNext" title="下一首">
                <IconBase>
                  <component :is="IconEnum.SkipForward" />
                </IconBase>
              </button>

              <button
                class="control-btn-large"
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
            <!-- 歌曲操作 -->
            <div class="song-actions">
              <button
                class="header-btn"
                :class="{ favorited: isFavorite }"
                @click="onToggleFavorite"
                :title="isFavorite ? '取消收藏' : '收藏'"
              >
                <IconBase>
                  <component :is="isFavorite ? IconEnum.HeartFilled : IconEnum.Heart" />
                </IconBase>
              </button>

              <button class="header-btn" @click.stop="onShowMoreActions" title="更多操作">
                <IconBase>
                  <component :is="IconEnum.EllipsisVertical" />
                </IconBase>
              </button>
            </div>
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
      </div>
    </section>
  </Transition>
</template>

<style lang="scss" scoped>
  .player-view {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1500;
    display: flex;
    flex-direction: column;
    background: var(--player-theme-bg);
    color: var(--player-text-primary);
    transition: all 0.2s;

    .player-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
      z-index: 1;
      display: flex;
      justify-content: center;
      align-items: center;

      .background-image {
        width: 150%;
        height: 150%;
        object-fit: cover;
      }

      .background-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgb(0 0 0 / 50%);
        backdrop-filter: blur(40px);
      }
    }

    .player-content {
      height: 100%;
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      padding: 20px;
      overflow: hidden;

      .player-header {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 10px 20px 20px;
        min-height: 60px;

        .song-title-header {
          width: 100%;
          font-size: 20px;
          line-height: 150%;
          font-weight: 500;
          text-align: center;
        }

        .song-artist-header {
          margin-top: 4px;
          font-size: 14px;
          line-height: 150%;
          color: var(--player-text-secondary);
          text-align: center;
        }
      }

      .player-body {
        flex-grow: 1;
        min-height: 0;
        display: flex;
        gap: 10px;

        .album-section {
          width: 45%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px 0;
          flex-shrink: 0;

          .album-art-wrapper {
            width: 300px;
            height: 300px;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgb(0 0 0 / 30%);
            cursor: pointer;
            transition: transform 0.3s;
            margin-bottom: 25px;

            &:hover {
              transform: scale(1.02);
            }

            .album-art-container {
              position: relative;
              width: 100%;
              height: 100%;

              .album-art-large {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }
            }

            .album-art-placeholder-large {
              width: 100%;
              height: 100%;
              background: var(--album-art-bg);
              display: flex;
              align-items: center;
              justify-content: center;

              svg {
                width: 80px;
              }
            }
          }

          .song-info-expanded {
            text-align: center;
            width: 100%;

            .song-album-expanded {
              font-size: 16px;
              color: var(--player-text-secondary);
              margin-bottom: 16px;
            }

            .quality-tags {
              display: flex;
              justify-content: center;
              gap: 8px;
              flex-wrap: wrap;

              .quality-tag {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                background: var(--player-btn-bg);
                color: var(--player-highlight);
                filter: brightness(1.3);
              }
            }
          }
        }

        .lyrics-section {
          flex: 1;
          min-height: 0;
          padding: 20px 0;
        }
      }

      .player-footer {
        flex-shrink: 0;
        padding-top: 20px;

        .progress-display {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;

          .time-display {
            font-size: 14px;
          }

          .progress-wrapper {
            flex: 1;
            position: relative;

            .visualizer-wrapper {
              width: 100%;
              height: 40px;
              position: absolute;
              bottom: 4px;
            }

            .progress-bar-large {
              width: 100%;
              height: 4px;
              background: rgb(255 255 255 / 20%);
              border-radius: 3px;
              cursor: pointer;
              position: relative;
              z-index: 1;

              .progress-track-large {
                height: 100%;
                position: relative;
                border-radius: 3px;
                background: var(--player-highlight);

                .progress-thumb-large {
                  position: absolute;
                  top: 50%;
                  right: -6px;
                  transform: translateY(-50%);
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  background: var(--player-highlight);

                  &:active {
                    cursor: grabbing;
                  }
                }
              }
            }
          }
        }

        .playback-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;

          .playback-controls-large {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;

            .control-btn-large {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
              color: var(--player-highlight);

              &:hover:not(:disabled) {
                filter: brightness(1.3);
              }

              &:disabled {
                opacity: 0.3;
                cursor: not-allowed;
              }
            }

            .play-pause-btn-large {
              width: 50px;
              height: 50px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
              background: var(--player-btn-bg);
              color: var(--player-highlight);

              &:hover {
                background: var(--player-btn-bg-hover);

                svg {
                  filter: brightness(1.3);
                }
              }

              svg {
                width: 25px;
              }
            }
          }

          .song-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            width: 150px;

            .header-btn {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
              background: var(--player-btn-bg);
              color: var(--player-highlight);

              &:hover {
                background: var(--player-btn-bg-hover);

                svg {
                  filter: brightness(1.3);
                }
              }

              &.favorited {
                color: red;
              }

              svg {
                width: 22px;
              }
            }
          }
        }
      }
    }
  }

  .player-ani-enter-active,
  .player-ani-leave-active {
    transition: all 0.3s ease;
  }

  .player-ani-enter-from {
    opacity: 0;
    transform: translateY(100%);
  }

  .player-ani-leave-to {
    opacity: 0;
    transform: translateY(100%);
  }
</style>
