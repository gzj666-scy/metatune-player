<script setup lang="ts">
  import { clsx } from '@metatune/common'
  import { watch, ref, StyleValue, watchEffect } from 'vue'

  export interface SwitchProps {
    checked?: boolean
    disabled?: boolean
    value?: boolean
  }

  const props = withDefaults(defineProps<SwitchProps>(), {
    checked: false,
    disabled: false,
    value: false,
  })

  const emit = defineEmits<{
    change: [checked: boolean, event: PointerEvent]
    click: [checked: boolean, event: PointerEvent]
  }>()

  const valueRef = ref(props.checked || props.value)
  const styleRef = ref<StyleValue>()
  const boxRef = ref<HTMLDivElement>()
  const ballRef = ref<HTMLDivElement>()

  const onClick = (e: PointerEvent) => {
    valueRef.value = !valueRef.value
    emit('change', valueRef.value, e)
    emit('click', valueRef.value, e)
  }

  const calcStyle = (checked: boolean) => {
    const box = boxRef.value
    const ball = ballRef.value
    if (!box || !ball) return
    if (checked) {
      const rectBox = box.getBoundingClientRect()
      const rectBall = ball.getBoundingClientRect()
      styleRef.value = {
        left: rectBox.width - rectBall.width - 2 + 'px',
      }
    } else {
      styleRef.value = {
        left: '2px',
      }
    }
  }

  // ✅ watchEffect 默认立即执行 + 自动追踪内部用到的响应式数据
  watchEffect(
    () => {
      // 自动追踪：valueRef.value, boxRef.value, ballRef.value
      if (boxRef.value && ballRef.value) {
        calcStyle(valueRef.value)
      }
      // 如果 ref 未就绪，依赖收集会等到下次更新再重试
    },
    { flush: 'post' }
  )

  watch(
    () => props.checked,
    newVal => {
      valueRef.value = newVal
    }
  )

  watch(
    () => props.value,
    newVal => {
      valueRef.value = newVal
    }
  )
</script>

<template>
  <div class="scy-switch" :class="clsx(valueRef ? 'checked' : 'unchecked', { disabled: props.disabled })" @click="onClick" ref="boxRef">
    <div class="scy-switch-bar" :style="styleRef" ref="ballRef"></div>
  </div>
</template>

<style lang="scss">
  .scy-switch {
    position: relative;
    cursor: pointer;

    &.checked {
      background: var(--btn-primary-bg);

      .scy-switch-bar {
        background: rgba(255, 255, 255, 0.9);
      }
    }

    &.unchecked {
      background: rgba(0, 0, 0, 0.1);

      .scy-switch-bar {
        background: rgba(255, 255, 255, 0.25);
      }
    }

    &.disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .scy-switch-bar {
      position: absolute;
      transition: all 0.2s;
      border-radius: 50%;
    }
  }
</style>
