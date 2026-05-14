<script setup lang="ts">
  import { ref, computed, watch, StyleValue, onUnmounted, onMounted } from 'vue'
  import { PlayMode, LyricParser, DynamicColorAdjuster, DefaultVolume, IconEnum, DefaultKey, PanelType, addRoundedTopSubpath } from '@metatune/common'
  import type { ILyricLine } from '@metatune/common'
  import IconBase from '@/components/base/IconBase.vue'
  import { getStoreManager } from '@/utils/storeManager'
  import { getPlayManager } from '@/utils/playManager'

  interface Props {
    show: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    show: false,
  })

  const emit = defineEmits<{
    close: []
    'load-lyrics': []
  }>()

  const playManager = getPlayManager()
  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const themeVarsRef = ref<Record<string, string>>({})
  const bgDominantColorRef = ref<[number, number, number]>([0, 0, 0])
  const isDraggingRef = ref(false)
  const dragTimeRef = ref(0)
  const progressContainerRef = ref<HTMLDivElement>()
  const lyricsLinesRef = ref<ILyricLine[]>([])
  const currentLyricIndexRef = ref(-1)
  const lyricsScrollYRef = ref(0)
  const lyricsContainerRef = ref<HTMLDivElement>()
  const isVolumeDraggingRef = ref(false)
  const showVolumeControlRef = ref(false)
  const volumeControlStyleRef = ref<StyleValue>()
  const volumeSliderRef = ref<HTMLDivElement>()
  const delayHideVolumeRef = ref()
  const canvasRef = ref<HTMLCanvasElement>()
  // const animationIdRef = ref<number>()
  const visualizationIdRef = ref()
  const visualizationTimeRef = ref(1000 / 50)
  const setupCanvasTimerRef = ref()
  const resizeObserverRef = ref()

  const song = computed(() => playerStore.currentSong)
  const sampleRate = computed(() => song.value?.sampleRate || 44100)
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
  const settings = computed(() => playerStore.settings)

  const onShowMoreActions = (e: MouseEvent) => {
    if (!song.value) return
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
    playerStore.panel = { type: PanelType.SongAction, data: { song: song.value, listKey: playerStore.currentState.currentListId, style } }
  }

  const onLoadExternalLyrics = () => {
    emit('load-lyrics')
  }

  const onSeekToLyric = (time: number) => {
    playManager.seekTo(time)
  }

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

  const parseLyrics = () => {
    if (song.value?.lyrics) {
      lyricsLinesRef.value = LyricParser.parseLRC(song.value.lyrics)
    } else {
      lyricsLinesRef.value = []
    }
  }

  const scrollToCurrentLyric = () => {
    if (currentLyricIndexRef.value < 0 || lyricsLinesRef.value.length === 0) return
    const lyricsContainer = lyricsContainerRef.value
    if (!lyricsContainer) return

    const rect = lyricsContainer.getBoundingClientRect()
    const lineHeight = 34 // 每行歌词的高度
    const targetPosition = currentLyricIndexRef.value * lineHeight

    lyricsScrollYRef.value = -targetPosition + rect.height / 2 - lineHeight / 2
  }

  const getLyricOpacity = (index: number) => {
    if (index === currentLyricIndexRef.value) return 1
    if (Math.abs(index - currentLyricIndexRef.value) <= 1) return 0.8
    return 0.6
  }

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /** 绘制频谱图的函数 */
  const drawSpectrum = () => {
    clearTimeout(visualizationIdRef.value)
    if (!settings.value.openVisualization) return
    if (!canvasRef.value) return
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (!isPlaying.value) return
    const visualizationData = playManager.getVisualizationData()
    if (!visualizationData) return

    // 由于 ctx.scale(dpr)，绘图时要转回 CSS 像素坐标
    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr
    // 清空画布
    ctx.clearRect(0, 0, width, height)
    let dataArray = visualizationData.frequency

    // 获取优化后的频域数据（过滤无效高频）
    const maxFreq = Math.min(12000, sampleRate.value / 2)
    const maxIndex = Math.floor((maxFreq / (sampleRate.value / 2)) * dataArray.length)
    // const maxIndex = Math.floor((2 * dataArray.length) / 3)
    dataArray = dataArray.slice(0, maxIndex)

    const margin = 2 // 左右留白
    const usableWidth = width - margin * 2
    const barCount = dataArray.length
    const barGap = 3 // 每根竖条之间的空隙（像素）
    const barWidth = usableWidth / barCount - barGap
    // 定义渐变（从右到左）
    const gradient = ctx.createLinearGradient(width, 0, 0, 0)
    gradient.addColorStop(0, themeVarsRef.value['--player-highlight'] || '#764ba2') // (右)
    gradient.addColorStop(0.5, '#60a5fa') // 天蓝色 (中)
    gradient.addColorStop(1, themeVarsRef.value['--player-highlight'] || '#667eea') // (左)
    // 线性频率映射
    // for (let i = 0; i < barCount; i++) {
    //   // 归一化：将 0-255 的值映射到 0 - maxHeight
    //   const value = dataArray[i] / 255
    //   const barHeight = value * height

    //   const x = margin + i * (barWidth + barGap)
    //   const y = height - barHeight - 0

    //   // 绘制竖线
    //   ctx.fillStyle = gradient
    //   ctx.beginPath()
    //   // ctx.roundRect(x, y, barWidth, barHeight, 10) // 设为0则直角
    //   roundRectTopOnly(ctx, x, y, barWidth, barHeight, 10)
    //   ctx.fill()
    // }

    // 绘制竖线（性能优化版）
    ctx.fillStyle = gradient
    ctx.beginPath()
    for (let i = 0; i < barCount; i++) {
      // 归一化：将 0-255 的值映射到 0 - maxHeight
      const value = dataArray[i] / 255
      const barHeight = value * height
      const x = margin + i * (barWidth + barGap)
      const y = height - barHeight - 0
      // 为每个柱添加子路径（不 close，最后统一 close）
      addRoundedTopSubpath(ctx, x, y, barWidth, barHeight, 10)
    }
    ctx.closePath()
    ctx.fill() // 一次性填充所有柱

    visualizationIdRef.value = setTimeout(drawSpectrum, visualizationTimeRef.value)
  }

  const initPlayerEvent = () => {
    const player = playManager.getPlayer()
    if (!player) return
    player.on('play', () => {
      clearTimeout(visualizationIdRef.value)
      visualizationIdRef.value = setTimeout(drawSpectrum, visualizationTimeRef.value)
    })
    player.on('pause', () => {
      clearTimeout(visualizationIdRef.value)
    })
    player.on('stop', () => {
      clearTimeout(visualizationIdRef.value)
    })
  }

  const setupCanvas = () => {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const parent = canvas.parentElement
    const rect = parent!.getBoundingClientRect()
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    // 防模糊
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = false // 频谱图不需要抗锯齿，提升性能
    clearInterval(setupCanvasTimerRef.value)
    visualizationIdRef.value = setTimeout(drawSpectrum, visualizationTimeRef.value)
    // 🔑 监听容器尺寸变化，自动重设 Canvas
    // resizeObserverRef.value = new ResizeObserver(() => {
    //   renderer?.resize()
    // })
    // resizeObserver.observe(canvas.value.parentElement!)
  }

  const clearCanvas = () => {
    // animationIdRef.value && cancelAnimationFrame(animationIdRef.value)
    clearTimeout(visualizationIdRef.value)
    const canvas = canvasRef.value
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }

  // 监听歌曲变化
  watch(
    () => song.value,
    async newSong => {
      if (newSong) {
        clearCanvas()
        // 解析歌词
        parseLyrics()

        // 重置歌词位置
        currentLyricIndexRef.value = -1
        lyricsScrollYRef.value = (lyricsContainerRef.value?.getBoundingClientRect()?.height || 0) / 2 || 224

        // 1. 获取图片主色
        const result = await DynamicColorAdjuster.getDominantColorFromImage(newSong.albumArt)
        // 2. 生成 CSS 变量
        const cssObject = DynamicColorAdjuster.generateThemeCSS(result.color, result.hasImg)

        themeVarsRef.value = cssObject
        bgDominantColorRef.value = result.color
        window.electronAPI?.setWindowTitle(`${newSong.artist} - ${newSong.title}`)
      }
    }
  )

  // 监听当前时间变化
  watch(
    () => currentTime.value,
    () => {
      if (!isDraggingRef.value && lyricsLinesRef.value.length > 0) {
        const { currentIndex } = LyricParser.getCurrentLyric(lyricsLinesRef.value, currentTime.value)

        if (currentIndex !== currentLyricIndexRef.value) {
          currentLyricIndexRef.value = currentIndex
          scrollToCurrentLyric()
        }
      }
    }
  )

  watch(
    () => props.show,
    newVal => {
      if (newVal) {
        setupCanvasTimerRef.value = setInterval(() => {
          setupCanvas()
        }, 20)
      }
    }
  )

  watch(
    () => settings.value.openVisualization,
    newVal => {
      if (newVal) {
        visualizationIdRef.value = setTimeout(drawSpectrum, visualizationTimeRef.value)
      } else {
        clearTimeout(visualizationIdRef.value)
      }
    }
  )

  onMounted(() => {
    initPlayerEvent()
  })

  onUnmounted(() => {
    clearTimeout(delayHideVolumeRef.value)
    clearInterval(setupCanvasTimerRef.value)
    clearTimeout(visualizationIdRef.value)
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

      <!-- 播放器内容 -->
      <div class="player-content">
        <!-- 顶部控制栏 -->
        <div class="player-header">
          <button class="header-btn" @click="$emit('close')" title="收起播放详情">
            <IconBase>
              <component :is="IconEnum.ChevronsDown" />
            </IconBase>
          </button>

          <div class="song-info-header">
            <div class="song-title-header">{{ song?.title || '--' }}</div>
            <div class="song-artist-header">{{ song?.artist || '--' }}</div>
          </div>

          <div class="header-actions">
            <button class="header-btn" :class="{ favorited: isFavorite }" @click="onToggleFavorite" :title="isFavorite ? '取消收藏' : '收藏'">
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

        <div class="player-body">
          <!-- 专辑封面区域 -->
          <div class="album-section">
            <div class="album-art-wrapper">
              <div v-if="song?.albumArt" class="album-art-container">
                <img :src="song.albumArt" :alt="song.album" class="album-art-large" />
                <div v-if="isPlaying" class="playing-overlay">
                  <div class="equalizer">
                    <div class="eq-bar" v-for="n in 5" :key="n"></div>
                  </div>
                </div>
              </div>
              <div v-else class="album-art-placeholder-large">
                <IconBase class="icon-music-large">
                  <component :is="IconEnum.Music" />
                </IconBase>
              </div>
            </div>

            <!-- 歌曲信息 -->
            <div class="song-info-expanded">
              <div v-if="song?.album" class="song-album-expanded">{{ song.album }}</div>

              <!-- 音质信息 -->
              <div v-if="song" class="quality-tags">
                <div v-if="song.qualityFlag" class="quality-tag">{{ song.qualityFlag }}</div>

                <div v-if="song.bitsPerSample" class="quality-tag">{{ song.bitsPerSample }}bit</div>

                <div v-if="song.bitrate" class="quality-tag">{{ Math.floor(song.bitrate / 1000) }}kbps</div>

                <div v-if="song.sampleRate" class="quality-tag">{{ song.sampleRate / 1000 }}kHz</div>
              </div>
            </div>
          </div>

          <!-- 歌词区域 -->
          <div class="lyrics-section">
            <div class="lyrics-container" ref="lyricsContainerRef">
              <div v-if="lyricsLinesRef.length === 0" class="no-lyrics">
                <div class="no-lyrics-text">暂无歌词</div>
                <button class="load-lyrics-btn" @click="onLoadExternalLyrics">加载歌词</button>
              </div>

              <div v-else class="lyrics-scroll" :style="{ transform: `translateY(${lyricsScrollYRef}px)` }">
                <div
                  v-for="(line, index) in lyricsLinesRef"
                  :key="index"
                  class="lyric-line"
                  :class="{ current: index === currentLyricIndexRef }"
                  :style="{ opacity: getLyricOpacity(index) }"
                  @click="onSeekToLyric(line.time)"
                >
                  <div class="lyric-text">{{ line.text }}</div>
                  <div v-if="line.translatedText" class="lyric-translation">
                    {{ line.translatedText }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 进度控制 -->
        <div class="player-footer">
          <div class="progress-display">
            <div class="time-display">{{ formatTime(currentTime) }}</div>
            <div class="progress-wrapper">
              <div class="visualizer-wrapper">
                <canvas ref="canvasRef"></canvas>
              </div>
              <div class="progress-bar-large" ref="progressContainerRef" @click="onProgressClick">
                <div class="progress-track-large" :style="{ width: progressPercent + '%' }">
                  <div class="progress-thumb-large" @mousedown="onProgressDrag" @touchstart="onProgressDrag"></div>
                </div>

                <!-- 缓冲进度 -->
                <!-- <div v-if="bufferedPercent > 0" class="buffered-track" :style="{ width: bufferedPercent + '%' }"></div> -->
              </div>
            </div>
            <div class="time-display">{{ formatTime(duration) }}</div>
          </div>

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
        object-fit: contain;
        // filter: blur(40px) brightness(1);
        // filter: blur(40px) brightness(0.8) saturate(0.9);
        // transform: scale(1.5);
        // width: 200%;
        // height: 200%;
        // background-repeat: no-repeat;
        // background-size: contain;
        // background-position: center;
        // filter: blur(40px) brightness(0.8);
      }

      .background-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
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
        align-items: center;
        justify-content: space-between;
        padding: 0 10px 20px;
        min-height: 60px;

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
              filter: brightness(1.5);
            }
          }

          &.favorited {
            color: red;
          }

          svg {
            width: 22px;
          }
        }

        .song-info-header {
          flex: 1;
          text-align: center;
          padding: 0 20px;

          .song-title-header {
            font-size: 20px;
            font-weight: 500;
            margin-bottom: 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .song-artist-header {
            font-size: 14px;
            color: var(--player-text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        .header-actions {
          display: flex;
          gap: 8px;
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
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
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

              .playing-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;

                .equalizer {
                  display: flex;
                  align-items: flex-end;
                  height: 40px;
                  gap: 4px;

                  .eq-bar {
                    width: 4px;
                    height: 20px;
                    background: currentColor;
                    border-radius: 2px;
                    animation: eqAnimation 1s infinite ease-in-out;

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
                    &:nth-child(5) {
                      animation-delay: 0.4s;
                    }
                  }
                }
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
          overflow: hidden;
          padding: 20px 0;

          .lyrics-container {
            height: 100%;
            overflow: hidden;
            position: relative;

            .no-lyrics {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
              gap: 16px;
              color: var(--player-highlight);

              .no-lyrics-text {
                font-size: 18px;
                filter: brightness(1.3);
              }

              .load-lyrics-btn {
                padding: 8px 20px;
                border-radius: 20px;
                border: none;
                font-size: 12px;
                transition: all 0.2s;
                background: var(--player-btn-bg);
                color: var(--player-text-primary);

                &:hover {
                  background: var(--player-btn-bg-hover);
                }
              }
            }

            .lyrics-scroll {
              transition: transform 0.3s ease;

              .lyric-line {
                text-align: center;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;

                &.current {
                  .lyric-text {
                    font-weight: 500;
                    transform: scale(1.3);
                    color: var(--player-highlight);
                  }
                }

                .lyric-text {
                  font-weight: 400;
                  font-size: 16px;
                  margin-bottom: 4px;
                  transition: all 0.3s;
                  line-height: 34px;

                  &:last-child {
                    margin-bottom: 0;
                  }
                }

                .lyric-translation {
                  font-size: 0.9em;
                  opacity: 0.8;
                  font-style: italic;
                }
              }
            }
          }

          .no-lyrics-icon {
            font-size: 60px;
            opacity: 0.5;
          }
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
              background: rgba(255, 255, 255, 0.2);
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

              .buffered-track {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                transition: width 0.2s;
              }
            }
          }
        }

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
              filter: brightness(1.5);
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
                filter: brightness(1.5);
              }
            }

            svg {
              width: 25px;
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
          box-shadow: var(--modal-shadow);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          z-index: 3;

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

  @keyframes eqAnimation {
    0%,
    100% {
      height: 10px;
    }
    50% {
      height: 30px;
    }
  }
</style>
