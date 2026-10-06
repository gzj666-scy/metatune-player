import { computed, ref, type Ref } from 'vue'
import { DefaultKey, DefaultVolume, IconEnum, PlayMode } from '@metatune/common/utils'
import { getPlayManager } from '@/utils/playManager'
import { getStoreManager } from '@/utils/storeManager'
import { useSliderDrag } from './useSliderDrag'

/**
 * 播放状态条与播放页共享的状态与控制逻辑
 * （v3 自 PlayerView / PlayerStatusBar 去重：进度、音量图标、播放模式、收藏等两边完全重复）
 * @param progressEl 进度条容器 ref（由组件声明并绑定到模板）
 */
export function usePlayerControls(progressEl: Ref<HTMLDivElement | undefined>) {
  const playManager = getPlayManager()
  const storeManager = getStoreManager()
  const { playerStore } = storeManager

  const isDraggingRef = ref(false)
  const dragTimeRef = ref(0)
  const progressContainerRef = progressEl

  const song = computed(() => playerStore.currentSong)
  const isPlaying = computed(() => playerStore.currentState.isPlaying)
  /** 拖动期间冻结显示拖动位置 */
  const currentTime = computed(() => {
    if (isDraggingRef.value) return dragTimeRef.value
    return playerStore.currentState.currentTime
  })
  const duration = computed(() => song.value?.duration || playerStore.playerDuration || 0)
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
  })
  const playModeIcon = computed(() => {
    switch (playMode.value) {
      case PlayMode.SHUFFLE:
        return IconEnum.Shuffle
      case PlayMode.REPEAT_ONE:
        return IconEnum.Repeat1
      default:
        return IconEnum.Repeat
    }
  })
  const playModeTitle = computed(() => {
    switch (playMode.value) {
      case PlayMode.SHUFFLE:
        return '随机播放'
      case PlayMode.REPEAT_ONE:
        return '单曲循环'
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

  // 进度条拖拽（横向：clientX → 时间）
  const progressDrag = useSliderDrag({
    getTarget: () => progressContainerRef.value,
    calcValue: (clientX, _clientY, rect) => {
      if (!duration.value || duration.value <= 0) return 0
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
      return (x / rect.width) * duration.value
    },
    onMove: value => {
      dragTimeRef.value = value
    },
    onEnd: value => {
      if (value >= 0) playManager.seekTo(value)
      dragTimeRef.value = 0
    },
    isDragging: isDraggingRef,
  })

  /** 进度条点击定位（拖拽中忽略） */
  function onProgressClick(event: MouseEvent) {
    if (!duration.value || duration.value <= 0) return
    if (isDraggingRef.value) return
    const time = progressDrag.getEventValue(event)
    playManager.seekTo(time)
  }

  /** 切换播放模式：列表循环 → 随机 → 单曲循环 */
  function onPlayMode() {
    const modes: Array<PlayMode> = [PlayMode.REPEAT_ALL, PlayMode.SHUFFLE, PlayMode.REPEAT_ONE]
    const currentIndex = modes.indexOf(playMode.value)
    playManager.setPlayMode(modes[(currentIndex + 1) % modes.length])
  }

  function onToggleMute() {
    playManager.toggleMute(!isMuted.value)
  }

  function onToggleFavorite() {
    if (song.value?.uid) {
      storeManager.updateFavorite([song.value.uid], !isFavorite.value)
    }
  }

  return {
    // 状态
    isDraggingRef,
    song,
    isPlaying,
    currentTime,
    duration,
    playMode,
    isMuted,
    volume,
    progressPercent,
    volumeIcon,
    playModeIcon,
    playModeTitle,
    canGoPrev,
    canGoNext,
    isFavorite,
    // 进度条
    progressDrag,
    onProgressClick,
    // 控制器
    onPlayMode,
    onToggleMute,
    onToggleFavorite,
  }
}
