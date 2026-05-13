import { ref, computed, defineComponent, createVNode, render, reactive } from 'vue'
import './loading.scss'

// 创建 DOM 容器
let dom: HTMLElement | null = null
if (typeof document !== 'undefined') {
  dom = document.querySelector('.scy-loading-box')
  if (!dom) {
    dom = document.createElement('div')
    dom.setAttribute('class', 'scy-loading-box')
    document.body.appendChild(dom)
  }
}

export type LoadingType = 'balls' | 'bars' | 'gates'

// 加载图标组件 (Vue 3 版本)
const LoadingIcon = defineComponent({
  props: {
    type: {
      type: String as () => LoadingType,
      default: 'balls',
    },
  },
  setup(props) {
    return () => {
      if (props.type === 'balls') {
        return (
          <svg class='scy-loading-icon-balls' x='0px' y='0px' width='54px' height='12px' viewBox='0 0 36 8'>
            <circle fill='currentColor' stroke='none' cx='4' cy='4' r='4'>
              <animate attributeName='opacity' attributeType='XML' values='1; .3; 1' begin='0s' dur='0.8s' repeatCount='indefinite'></animate>
            </circle>
            <circle fill='currentColor' stroke='none' cx='18' cy='4' r='4'>
              <animate attributeName='opacity' attributeType='XML' values='1; .3; 1' begin='0.27s' dur='0.8s' repeatCount='indefinite'></animate>
            </circle>
            <circle fill='currentColor' stroke='none' cx='32' cy='4' r='4'>
              <animate attributeName='opacity' attributeType='XML' values='1; .3; 1' begin='0.54s' dur='0.8s' repeatCount='indefinite'></animate>
            </circle>
          </svg>
        )
      } else if (props.type === 'gates') {
        return (
          <svg class='scy-loading-icon-gates' width='36px' height='36px' viewBox='0 0 66 66' xmlns='http://www.w3.org/2000/svg'>
            <circle class='scy-loading-icon-gates-circle' fill='none' stroke-width='14' stroke-linecap='butt' cx='33' cy='33' r='20'></circle>
            <rect class='scy-loading-icon-gates-square' x='32' y='20' width='14' height='14' fill='#17E5A1'></rect>
          </svg>
        )
      }
      // bars 类型 (默认)
      return (
        <svg class='scy-loading-icon-bars' xmlns='http://www.w3.org/2000/svg' width='48px' height='48px' viewBox='0 0 32 32'>
          <path transform='translate(2)' d='M0 12 V20 H4 V12z'>
            <animate
              attributeName='d'
              values='M0 12 V20 H4 V12z; M0 4 V28 H4 V4z; M0 12 V20 H4 V12z; M0 12 V20 H4 V12z'
              dur='1.2s'
              repeatCount='indefinite'
              begin='0'
              keyTimes='0;.2;.5;1'
              keySplines='0.2 0.2 0.4 0.8;0.2 0.6 0.4 0.8;0.2 0.8 0.4 0.8'
              calcMode='spline'
            />
          </path>
          <path transform='translate(8)' d='M0 12 V20 H4 V12z'>
            <animate
              attributeName='d'
              values='M0 12 V20 H4 V12z; M0 4 V28 H4 V4z; M0 12 V20 H4 V12z; M0 12 V20 H4 V12z'
              dur='1.2s'
              repeatCount='indefinite'
              begin='0.2'
              keyTimes='0;.2;.5;1'
              keySplines='0.2 0.2 0.4 0.8;0.2 0.6 0.4 0.8;0.2 0.8 0.4 0.8'
              calcMode='spline'
            />
          </path>
          <path transform='translate(14)' d='M0 12 V20 H4 V12z'>
            <animate
              attributeName='d'
              values='M0 12 V20 H4 V12z; M0 4 V28 H4 V4z; M0 12 V20 H4 V12z; M0 12 V20 H4 V12z'
              dur='1.2s'
              repeatCount='indefinite'
              begin='0.4'
              keyTimes='0;.2;.5;1'
              keySplines='0.2 0.2 0.4 0.8;0.2 0.6 0.4 0.8;0.2 0.8 0.4 0.8'
              calcMode='spline'
            />
          </path>
          <path transform='translate(20)' d='M0 12 V20 H4 V12z'>
            <animate
              attributeName='d'
              values='M0 12 V20 H4 V12z; M0 4 V28 H4 V4z; M0 12 V20 H4 V12z; M0 12 V20 H4 V12z'
              dur='1.2s'
              repeatCount='indefinite'
              begin='0.6'
              keyTimes='0;.2;.5;1'
              keySplines='0.2 0.2 0.4 0.8;0.2 0.6 0.4 0.8;0.2 0.8 0.4 0.8'
              calcMode='spline'
            />
          </path>
          <path transform='translate(26)' d='M0 12 V20 H4 V12z'>
            <animate
              attributeName='d'
              values='M0 12 V20 H4 V12z; M0 4 V28 H4 V4z; M0 12 V20 H4 V12z; M0 12 V20 H4 V12z'
              dur='1.2s'
              repeatCount='indefinite'
              begin='0.8'
              keyTimes='0;.2;.5;1'
              keySplines='0.2 0.2 0.4 0.8;0.2 0.6 0.4 0.8;0.2 0.8 0.4 0.8'
              calcMode='spline'
            />
          </path>
        </svg>
      )
    }
  },
})

// 内部加载组件
const InternalLoading = defineComponent({
  props: {
    content: { type: null, default: null },
    duration: { type: Number, default: undefined },
    type: { type: String as () => LoadingType, default: 'balls' },
  },
  setup(props) {
    // 定时器处理
    let timeoutId: number | null = null

    // 使用 onMounted 和 onUnmounted 替代 useSafeEffect
    import('vue').then(({ onMounted, onUnmounted }) => {
      onMounted(() => {
        if (props.duration) {
          timeoutId = window.setTimeout(() => {
            Loading.hide()
          }, props.duration)
        }
      })

      onUnmounted(() => {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
      })
    })

    return () => {
      return (
        <div class='scy-loading'>
          <div class='scy-loading-content'>
            <div class='scy-loading-content-icon'>
              <LoadingIcon type={props.type} />
            </div>
            {props.content && <div class='scy-loading-content-text'>{props.content}</div>}
          </div>
        </div>
      )
    }
  },
})

// 计数器
let loadingCount = 0

// 导出 Loading 对象
export const Loading = {
  dom: null,
  show(options?: { content?: any; duration?: number; type?: LoadingType }) {
    if (!dom) return
    loadingCount++
    const vnode = createVNode(InternalLoading, {
      content: options?.content,
      duration: options?.duration,
      type: options?.type || 'balls',
      key: Date.now(),
    })
    render(vnode, dom)
  },
  hide(force?: boolean) {
    if (!dom) return
    loadingCount--
    if (loadingCount <= 0 || force) {
      loadingCount = 0
      render(null, dom)
    }
  },
}
