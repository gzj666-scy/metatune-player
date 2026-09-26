<script setup lang="ts">
  import { computed, useSlots, VNode, useCssModule } from 'vue'
  import type { SVGAttributes, CSSProperties } from 'vue'

  export interface IconBaseProps extends /* @vue-ignore */ Omit<SVGAttributes, 'style'> {
    style?: CSSProperties
    spin?: boolean
  }

  // defineOptions({
  //   inheritAttrs: false, // 👈 关键：关闭自动透传
  // })

  const props = withDefaults(defineProps<IconBaseProps>(), {
    spin: false,
  })

  const slots = useSlots()
  const $style = useCssModule()

  // 获取 SVG 子元素
  const svgElement = computed<VNode | null>(() => {
    const children = slots.default?.()

    if (!children || children.length === 0) {
      console.warn('IconBase 需要传入 SVG 元素作为默认插槽')
      return null
    }

    const child = children[0]
    // 检查是否是 SVG 元素
    if (typeof child.type === 'string' && child.type !== 'svg') {
      console.warn('IconBase 只支持 SVG 元素作为子元素')
      return null
    }

    return child
  })

  // 合并后的属性
  const combinedAttrs = computed<SVGAttributes>(() => {
    if (!svgElement.value) return {}

    const baseAttrs = svgElement.value.props || {}
    const { style, spin, ...restProps } = props

    return { ...baseAttrs, ...restProps }
  })

  // 计算类名
  const computedClass = computed<string | Record<string, boolean>>(() => {
    if (!svgElement.value) return {}
    // 在 Vue 3 中 class 和 style 不会出现在 props 中，直接透传给根元素，并与内部已有class合并
    // const baseClass = (svgElement.value.props as any)?.class || ''

    const classes = [$style['scy-icon']]
    // if (baseClass) classes.push(baseClass)
    if (props.spin) classes.push($style['scy-icon-spin'])

    if (classes.length === 0) return {}
    if (classes.length === 1) return classes[0]

    return classes.join(' ')
  })

  // 计算样式
  const computedStyle = computed<Record<string, any>>(() => {
    if (!svgElement.value) return {}

    const baseStyle = (svgElement.value.props as any)?.style || {}
    const propsStyle = props.style || {}

    return { ...baseStyle, ...propsStyle }
  })
</script>

<template>
  <component :is="svgElement" v-bind="combinedAttrs" :class="computedClass" :style="computedStyle" />
</template>

<style module lang="scss">
  .scy-icon {
    width: 20px;
    height: auto;
  }

  .scy-icon-spin {
    animation: scy-icon-spin 1s linear infinite;
  }

  @keyframes scy-icon-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
