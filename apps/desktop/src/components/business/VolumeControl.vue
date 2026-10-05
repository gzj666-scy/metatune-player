<script setup lang="ts">
  import { ref, StyleValue } from 'vue'
  import { useSliderDrag } from '@/composables/useSliderDrag'

  /**
   * 音量调节弹层（v3 自 PlayerView/PlayerStatusBar 去重）：
   * 垂直滑轨 + 数值标签，显示位置与显隐由父级控制。
   */
  interface Props {
    volume: number
    style?: StyleValue
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    change: [volume: number]
  }>()

  const volumeSliderRef = ref<HTMLDivElement>()
  const isVolumeDraggingRef = ref(false)

  const volumeDrag = useSliderDrag({
    getTarget: () => volumeSliderRef.value,
    calcValue: (_clientX, clientY, rect) => {
      const percentage = Math.round(((rect.bottom - clientY) / rect.height) * 100)
      return Math.max(0, Math.min(percentage, 100))
    },
    onMove: value => emit('change', value),
    isDragging: isVolumeDraggingRef,
  })

  function onVolumeClick(event: MouseEvent) {
    if (isVolumeDraggingRef.value) return
    emit('change', volumeDrag.getEventValue(event))
  }
</script>

<template>
  <div class="volume-control" :style="props.style">
    <div class="volume-slider" ref="volumeSliderRef" @click="onVolumeClick">
      <div class="volume-track" :style="{ height: props.volume + '%' }"></div>
      <div
        class="volume-thumb"
        :style="{ bottom: props.volume + '%' }"
        @mousedown="volumeDrag.startDrag"
        @touchstart="volumeDrag.startDrag"
      ></div>
    </div>
    <div class="volume-label">{{ props.volume }}</div>
  </div>
</template>

<style scoped lang="scss">
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
</style>
