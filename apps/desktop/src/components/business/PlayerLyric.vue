<script setup lang="ts">
  import { onUnmounted, ref, StyleValue, watch, watchEffect } from 'vue'
  import { LyricParser, useRefs } from '@metatune/common'
  import type { ILyricLine, ISong } from '@metatune/common'

  interface Props {
    song: ISong | null
    currentTime: number
    /** 拖动进度期间的时间变化不响应歌词滚动 */
    isDragging: boolean
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    seek: [time: number]
    load: [data: ISong | null]
  }>()

  const lyricsContainerRef = ref<HTMLDivElement>()
  const lyricsContainerRectRef = ref<DOMRect>()
  const lyricsContainerStyleRef = ref<StyleValue>()
  const lyricsLinesRef = ref<ILyricLine[]>([])
  const currentLyricIndexRef = ref(-1)
  // const targetPositionRef = ref(0)
  const [itemRefs, setRefs] = useRefs<HTMLDivElement>()
  const resizeObserverRef = ref<ResizeObserver>()

  const onLoadExternalLyrics = () => {
    emit('load', props.song)
  }

  const onSeekToLyric = (time: number) => {
    emit('seek', time)
  }

  const calcLyricsContainer = () => {
    const box = lyricsContainerRef.value
    if (!box) return
    // const currentIndex = currentLyricIndexRef.value
    // if (currentIndex < 0) {
    //   targetPositionRef.value = 0
    //   return
    // } else {
    //   let targetPosition = 0
    //   for (let index = 0; index < itemRefs.length; index++) {
    //     if (currentIndex > index) {
    //       const item = itemRefs[index]
    //       const itemRect = item.getBoundingClientRect()
    //       targetPosition += itemRect.height
    //     } else {
    //       break
    //     }
    //   }
    //   targetPositionRef.value = targetPosition
    // }
    const rect = box.getBoundingClientRect()
    lyricsContainerRectRef.value = rect
  }

  const parseLyrics = () => {
    if (props.song?.lyrics) {
      lyricsLinesRef.value = LyricParser.parseLRC(props.song.lyrics)
    } else {
      lyricsLinesRef.value = []
    }
  }

  const getLyricOpacity = (index: number) => {
    if (index === currentLyricIndexRef.value) return 1
    if (Math.abs(index - currentLyricIndexRef.value) <= 1) return 1
    return 0.6
  }

  const scrollToCurrentLyric = () => {
    if (lyricsLinesRef.value.length === 0) return
    if (!lyricsContainerRectRef.value) return
    if (itemRefs?.length === 0) return
    const currentIndex = currentLyricIndexRef.value
    if (currentIndex < 0) {
      lyricsContainerStyleRef.value = { transform: `translateY(${lyricsContainerRectRef.value.height / 2}px)` }
      return
    }
    let targetPosition = 0
    for (let index = 0; index < itemRefs.length; index++) {
      if (currentIndex > index) {
        const item = itemRefs[index]
        const itemRect = item.getBoundingClientRect()
        targetPosition += itemRect.height
      } else {
        break
      }
    }
    const currentItemRect = itemRefs[currentIndex].getBoundingClientRect()
    const scrollY = lyricsContainerRectRef.value.height / 2 - targetPosition - currentItemRect.height / 2
    lyricsContainerStyleRef.value = { transition: 'transform .3s ease', transform: `translateY(${scrollY}px)` }
    // targetPositionRef.value += currentItemRect.height
  }

  watchEffect(
    () => {
      if (lyricsContainerRef.value) {
        if (resizeObserverRef.value) {
          resizeObserverRef.value.disconnect()
          resizeObserverRef.value = undefined
        }
        resizeObserverRef.value = new ResizeObserver(() => {
          calcLyricsContainer()
          scrollToCurrentLyric()
        })
        resizeObserverRef.value.observe(lyricsContainerRef.value)
      }
    },
    { flush: 'post' }
  )

  watchEffect(() => {
    if (!props.isDragging && lyricsLinesRef.value.length > 0 && props.currentTime >= 0) {
      const { currentIndex } = LyricParser.getCurrentLyric(lyricsLinesRef.value, props.currentTime)
      if (currentIndex !== currentLyricIndexRef.value) {
        currentLyricIndexRef.value = currentIndex
        scrollToCurrentLyric()
      }
    }
  })

  watch(
    () => props.song,
    newVal => {
      if (newVal) {
        parseLyrics()
        // 重置歌词位置
        currentLyricIndexRef.value = -1
        // targetPositionRef.value = 0
        const scrollY = (lyricsContainerRectRef.value?.height || 0) / 2 || 240
        lyricsContainerStyleRef.value = { transform: `translateY(${scrollY}px)` }
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    resizeObserverRef.value?.disconnect()
  })
</script>

<template>
  <div class="lyrics-container" ref="lyricsContainerRef">
    <div v-if="lyricsLinesRef.length === 0" class="no-lyrics">
      <div class="no-lyrics-text">暂无歌词</div>
      <button class="load-lyrics-btn" @click="onLoadExternalLyrics">加载歌词</button>
    </div>

    <div v-else class="lyrics-scroll" :style="lyricsContainerStyleRef">
      <div
        v-for="(line, index) in lyricsLinesRef"
        :key="index"
        class="lyric-line"
        :class="{ current: index === currentLyricIndexRef }"
        :style="{ opacity: getLyricOpacity(index) }"
        @click="onSeekToLyric(line.time)"
        :ref="setRefs(index)"
      >
        <div class="lyric-text">{{ line.text }}</div>
        <div v-if="line.translatedText" class="lyric-translation">
          {{ line.translatedText }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .lyrics-container {
    width: 100%;
    height: 100%;
    overflow: hidden;

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
        // filter: brightness(1.3);
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
      .lyric-line {
        text-align: center;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4px 0;

        &.current {
          color: var(--player-highlight);
          text-shadow: 0px 1px 0 var(--player-canvas-l);

          .lyric-text {
            font-weight: 500;
            transform: scale(1.2);
          }

          .lyric-translation {
            transform: scale(1.2);
          }
        }

        .lyric-text {
          flex-shrink: 0;
          font-weight: 400;
          font-size: 16px;
          line-height: 130%;
          transition: all 0.2s;
          min-height: 32px;
          display: flex;
          align-items: center;
          max-width: 80%;
        }

        .lyric-translation {
          flex-shrink: 0;
          transition: all 0.2s;
          font-size: 14px;
          line-height: 20px;
          max-width: 80%;
        }
      }
    }
  }
</style>
