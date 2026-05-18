import { defineComponent } from 'vue'

export const IconEnum = {
  /** 信息 */
  Info: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <circle cx='12' cy='12' r='10'></circle>
          <path d='M12 16v-4'></path>
          <path d='M12 8h.01'></path>
        </svg>
      )
    },
  }),
  /** 上下箭头 */
  ArrowDownUp: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='m3 16 4 4 4-4'></path>
          <path d='M7 20V4'></path>
          <path d='m21 8-4-4-4 4'></path>
          <path d='M17 4v16'></path>
        </svg>
      )
    },
  }),
  /** 向下 */
  ChevronDown: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='m6 9 6 6 6-6'></path>
        </svg>
      )
    },
  }),
  /** 向上 */
  ChevronUp: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='m18 15-6-6-6 6'></path>
        </svg>
      )
    },
  }),
  /** 双向下 */
  ChevronsDown: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='m7 6 5 5 5-5'></path>
          <path d='m7 13 5 5 5-5'></path>
        </svg>
      )
    },
  }),
  /** 双向上 */
  ChevronsUp: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='m17 11-5-5-5 5'></path>
          <path d='m17 18-5-5-5 5'></path>
        </svg>
      )
    },
  }),
  /** 刷新 */
  RefreshCw: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'></path>
          <path d='M21 3v5h-5'></path>
          <path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'></path>
          <path d='M8 16H3v5'></path>
        </svg>
      )
    },
  }),
  /** 顺时针旋转 */
  RotateCw: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'></path>
          <path d='M21 3v5h-5'></path>
        </svg>
      )
    },
  }),
  /** 重复 */
  Repeat: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='m17 2 4 4-4 4'></path>
          <path d='M3 11v-1a4 4 0 0 1 4-4h14'></path>
          <path d='m7 22-4-4 4-4'></path>
          <path d='M21 13v1a4 4 0 0 1-4 4H3'></path>
        </svg>
      )
    },
  }),
  /** 单曲循环 */
  Repeat1: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='m17 2 4 4-4 4'></path>
          <path d='M3 11v-1a4 4 0 0 1 4-4h14'></path>
          <path d='m7 22-4-4 4-4'></path>
          <path d='M21 13v1a4 4 0 0 1-4 4H3'></path>
          <path d='M11 10h1v4'></path>
        </svg>
      )
    },
  }),
  /** 随机 */
  Shuffle: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='m18 14 4 4-4 4'></path>
          <path d='m18 2 4 4-4 4'></path>
          <path d='M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22'></path>
          <path d='M2 6h1.972a4 4 0 0 1 3.6 2.2'></path>
          <path d='M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45'></path>
        </svg>
      )
    },
  }),
  /** 文件 */
  File: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'></path>
          <path d='M14 2v4a2 2 0 0 0 2 2h4'></path>
        </svg>
      )
    },
  }),
  /** 导入文件 */
  FileInput: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4'></path>
          <path d='M14 2v4a2 2 0 0 0 2 2h4'></path>
          <path d='M2 15h10'></path>
          <path d='m9 18 3-3-3-3'></path>
        </svg>
      )
    },
  }),
  /** 文件夹 */
  Folder: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'></path>
        </svg>
      )
    },
  }),
  /** 导入文件夹 */
  FolderInput: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1'></path>
          <path d='M2 13h10'></path>
          <path d='m9 16 3-3-3-3'></path>
        </svg>
      )
    },
  }),
  /** 音乐 */
  Music: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M9 18V5l12-2v13'></path>
          <circle cx='6' cy='18' r='3'></circle>
          <circle cx='18' cy='16' r='3'></circle>
        </svg>
      )
    },
  }),
  /** 音乐列表 */
  ListMusic: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M21 15V6'></path>
          <path d='M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'></path>
          <path d='M12 12H3'></path>
          <path d='M16 6H3'></path>
          <path d='M12 18H3'></path>
        </svg>
      )
    },
  }),
  /** 暂停 */
  Pause: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <rect x='14' y='4' width='4' height='16' rx='1'></rect>
          <rect x='6' y='4' width='4' height='16' rx='1'></rect>
        </svg>
      )
    },
  }),
  /** 播放 */
  Play: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <polygon points='6 3 20 12 6 21 6 3'></polygon>
        </svg>
      )
    },
  }),
  /** 上一曲 */
  SkipBack: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <polygon points='19 20 9 12 19 4 19 20'></polygon>
          <line x1='5' x2='5' y1='19' y2='5'></line>
        </svg>
      )
    },
  }),
  /** 下一曲 */
  SkipForward: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <polygon points='5 4 15 12 5 20 5 4'></polygon>
          <line x1='19' x2='19' y1='5' y2='19'></line>
        </svg>
      )
    },
  }),
  /** 定位 */
  Locate: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <line x1='2' x2='5' y1='12' y2='12'></line>
          <line x1='19' x2='22' y1='12' y2='12'></line>
          <line x1='12' x2='12' y1='2' y2='5'></line>
          <line x1='12' x2='12' y1='19' y2='22'></line>
          <circle cx='12' cy='12' r='7'></circle>
        </svg>
      )
    },
  }),
  /** 垂直省略号 */
  EllipsisVertical: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <circle cx='12' cy='12' r='1'></circle>
          <circle cx='12' cy='5' r='1'></circle>
          <circle cx='12' cy='19' r='1'></circle>
        </svg>
      )
    },
  }),
  /** 爱心 */
  Heart: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'></path>
        </svg>
      )
    },
  }),
  /** 实心爱心 */
  HeartFilled: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='currentColor'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'></path>
        </svg>
      )
    },
  }),
  /** 加号 */
  Plus: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M5 12h14'></path>
          <path d='M12 5v14'></path>
        </svg>
      )
    },
  }),
  /** 减号 */
  Minus: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M5 12h14'></path>
        </svg>
      )
    },
  }),
  /** 搜索 */
  Search: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <circle cx='11' cy='11' r='8'></circle>
          <path d='m21 21-4.3-4.3'></path>
        </svg>
      )
    },
  }),
  /** 设置 */
  Settings: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'></path>
          <circle cx='12' cy='12' r='3'></circle>
        </svg>
      )
    },
  }),
  /** 方形 */
  Square: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <rect width='18' height='18' x='3' y='3' rx='2'></rect>
        </svg>
      )
    },
  }),
  /** 关闭 */
  Close: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M18 6 6 18'></path>
          <path d='m6 6 12 12'></path>
        </svg>
      )
    },
  }),
  /** 圆形关闭 */
  CircleClose: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <circle cx='12' cy='12' r='10'></circle>
          <path d='m15 9-6 6'></path>
          <path d='m9 9 6 6'></path>
        </svg>
      )
    },
  }),
  /** 实心圆形关闭 */
  CircleCloseFilled: defineComponent({
    render() {
      return (
        <svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='currentColor' stroke='none'>
          <path d='M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-6.489 5.8a1 1 0 0 0 -1.218 1.567l1.292 1.293l-1.292 1.293l-.083 .094a1 1 0 0 0 1.497 1.32l1.293 -1.292l1.293 1.292l.094 .083a1 1 0 0 0 1.32 -1.497l-1.292 -1.293l1.292 -1.293l.083 -.094a1 1 0 0 0 -1.497 -1.32l-1.293 1.292l-1.293 -1.292l-.094 -.083z'></path>
        </svg>
      )
    },
  }),
  /** 勾选 */
  Check: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M20 6 9 17l-5-5'></path>
        </svg>
      )
    },
  }),
  /** 多项完成 */
  ListChecks: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='m3 17 2 2 4-4'></path>
          <path d='m3 7 2 2 4-4'></path>
          <path d='M13 6h8'></path>
          <path d='M13 12h8'></path>
          <path d='M13 18h8'></path>
        </svg>
      )
    },
  }),
  /** 删除 */
  Delete: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M3 6h18'></path>
          <path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'></path>
          <path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'></path>
          <line x1='10' x2='10' y1='11' y2='17'></line>
          <line x1='14' x2='14' y1='11' y2='17'></line>
        </svg>
      )
    },
  }),
  /** 用户 */
  User: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <circle cx='12' cy='8' r='5'></circle>
          <path d='M20 21a8 8 0 0 0-16 0'></path>
        </svg>
      )
    },
  }),
  /** 光盘 */
  Disc: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <circle cx='12' cy='12' r='10'></circle>
          <circle cx='12' cy='12' r='2'></circle>
        </svg>
      )
    },
  }),
  /** 静音 */
  VolumeX: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z'></path>
          <line x1='22' x2='16' y1='9' y2='15'></line>
          <line x1='16' x2='22' y1='9' y2='15'></line>
        </svg>
      )
    },
  }),
  /** 音量 */
  Volume: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z'></path>
        </svg>
      )
    },
  }),
  /** 低音量 */
  Volume1: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z'></path>
          <path d='M16 9a5 5 0 0 1 0 6'></path>
        </svg>
      )
    },
  }),
  /** 高音量 */
  Volume2: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z'></path>
          <path d='M16 9a5 5 0 0 1 0 6'></path>
          <path d='M19.364 18.364a9 9 0 0 0 0-12.728'></path>
        </svg>
      )
    },
  }),
  /** 空状态 */
  Empty: defineComponent({
    render() {
      return (
        <svg width='96' height='96' viewBox='0 0 96 96' fill='currentColor' xmlns='http://www.w3.org/2000/svg'>
          <path
            fill-rule='evenodd'
            clip-rule='evenodd'
            d='M47.0387 10C53.283 10 59.1239 11.783 64.0689 14.8752C63.9523 15.1973 63.8447 15.5237 63.7463 15.8541C58.9114 12.7778 53.1762 11 47.0387 11C30.2891 11 16.5359 24.2409 15.9003 40.9784L15.6604 47.2949L51.8585 32.7854C52.0907 32.6601 52.3329 32.553 52.585 32.4652C52.692 32.4279 52.7998 32.3944 52.9083 32.3646L53.1288 32.2762L53.1396 32.3071C57.428 31.3498 62.738 36.1047 65.2468 43.3005C67.7556 50.4962 66.5529 57.5218 62.5988 59.4382L62.61 59.4703L62.3715 59.5414C62.2714 59.5839 62.1696 59.6232 62.0662 59.6592C61.8178 59.7458 61.5652 59.8119 61.3093 59.858L20.9086 71.9016C20.9923 72.5675 21.1247 73.2495 21.3094 73.939C22.017 76.5797 23.335 78.7406 24.8421 80.1114C26.3588 81.4907 27.9508 81.9832 29.3075 81.6196C29.4764 81.5744 29.6398 81.5168 29.7977 81.4473L29.8938 81.405L29.9966 81.3837L39.6745 79.371C38.832 79.0172 38.0199 78.4709 37.2735 77.7786C35.5419 76.1724 34.0998 73.7309 33.3257 70.8418C33.1043 70.0156 32.9485 69.1937 32.8552 68.3885L33.8292 68.0981C33.9136 68.9078 34.0659 69.7409 34.2916 70.583C35.0247 73.319 36.3803 75.5861 37.9535 77.0454C39.5326 78.51 41.2678 79.1125 42.8104 78.6992L42.8154 78.7178L78.3674 71.3242C75.5681 69.9954 72.8058 66.0456 71.4426 60.9582C70.0857 55.8941 70.493 51.1128 72.2327 48.5536L66.556 50.3567C66.5505 50.0165 66.5357 49.6712 66.5115 49.3216L74.0948 46.9129L74.2135 46.8752C74.3423 46.824 74.4743 46.7802 74.6093 46.7441C74.638 46.7364 74.6667 46.7291 74.6955 46.7221L75.0488 46.6099L75.058 46.6439C74.9715 46.6588 74.8855 46.677 74.8 46.6985C78.3582 45.9508 82.6459 50.7047 84.4588 57.4706C86.2276 64.072 84.9984 70.1927 81.7281 71.5373L81.7559 71.6409L80.7753 71.8449L80.3533 71.9326L81.0774 91H13L14.901 40.9405C15.557 23.6658 29.7516 10 47.0387 10ZM61.2776 59.8636L61.2677 59.8654L61.2318 59.8714L61.2776 59.8636ZM79.3604 72.1391L30.2002 82.3627C29.9961 82.4525 29.7847 82.527 29.5664 82.5856C29.3721 82.6376 29.1763 82.6759 28.9794 82.7008L28.9947 82.758C25.5276 83.2607 21.7091 79.5991 20.28 74.2656C20.099 73.5901 19.9646 72.9187 19.8745 72.2585L19.9445 72.2376L19.9381 72.1909L14.6552 73.7658L14.0387 90H80.0387L79.3604 72.1391ZM14.6953 72.7103L58.5334 59.6421C54.9947 58.5332 51.3538 54.4155 49.4043 48.8239C47.4552 43.2336 47.7463 37.7459 49.8273 34.6769L15.6189 48.3889L14.6953 72.7103ZM78.1771 40.9784C78.1487 40.2295 78.094 39.4875 78.0139 38.7535C78.3509 38.8097 78.6911 38.8566 79.0342 38.8939C79.1027 39.5699 79.1503 40.2523 79.1764 40.9404L79.4584 48.3663C79.1192 48.056 78.7743 47.7825 78.4266 47.5491L78.1771 40.9784ZM64.3026 43.6297C65.5639 47.2475 65.8335 50.7751 65.2972 53.533C64.7555 56.3191 63.4484 58.1183 61.7369 58.715C60.0254 59.3117 57.8831 58.7152 55.7267 56.8698C53.592 55.0431 51.6099 52.1125 50.3485 48.4947C49.0872 44.8769 48.8177 41.3493 49.3539 38.5914C49.8956 35.8053 51.2027 34.0061 52.9142 33.4094C54.6257 32.8127 56.768 33.4092 58.9245 35.2546C61.0591 37.0813 63.0412 40.0119 64.3026 43.6297ZM83.9393 66.5817C84.4707 64.1964 84.3825 61.0496 83.4928 57.7294C82.6032 54.4091 81.1062 51.6399 79.4533 49.8398C77.7636 47.9996 76.124 47.3735 74.8681 47.71C73.6122 48.0465 72.5054 49.4086 71.9621 51.8471C71.4307 54.2324 71.5189 57.3792 72.4085 60.6994C73.2982 64.0197 74.7952 66.7889 76.4481 68.589C78.1378 70.4292 79.7774 71.0553 81.0333 70.7188C82.2891 70.3823 83.396 69.0202 83.9393 66.5817ZM81.3852 57.8927C81.9955 60.1702 82.0892 62.3043 81.789 63.895C81.5689 65.0616 81.1806 65.7659 80.7732 66.1359L76.011 51.0995C76.0504 51.0837 76.0895 51.0707 76.1282 51.0604C76.6949 50.9085 77.6268 51.205 78.7338 52.4926C79.7891 53.7201 80.7749 55.6151 81.3852 57.8927ZM82.3511 57.6338C83.5163 61.9822 82.9383 65.9948 81.0937 67.1477L81.0937 67.1479C80.9107 67.2623 80.7152 67.3485 80.5077 67.4041C80.1688 67.495 79.8168 67.499 79.4588 67.4246C78.906 67.3098 78.339 67.0079 77.784 66.5496C76.26 65.2909 74.8262 62.8521 74.0257 59.8646C72.7449 55.0847 73.5704 50.7104 75.8694 50.0944C78.1684 49.4784 81.0703 52.8539 82.3511 57.6338ZM61.3701 56.8087C63.3779 56.1086 64.4819 54.0802 64.8703 51.7899C65.2656 49.4595 64.983 46.601 63.9857 43.7404C62.9883 40.8797 61.4324 38.4652 59.674 36.8857C57.9458 35.3334 55.82 34.431 53.8122 35.131C51.8043 35.831 50.7004 37.8595 50.3119 40.1498C49.9166 42.4802 50.1992 45.3387 51.1965 48.1993C52.1939 51.0599 53.7498 53.4745 55.5083 55.054C57.2364 56.6063 59.3622 57.5087 61.3701 56.8087ZM63.0414 44.0696C64.9467 49.5342 64.051 54.8149 61.0409 55.8644C61.0238 55.8703 61.0067 55.8761 60.9896 55.8817C61.0067 55.8761 61.0238 55.8703 61.0408 55.8643C61.2271 55.7994 61.4054 55.7182 61.5753 55.6218L54.1928 36.0578C57.1967 35.0665 61.147 38.636 63.0414 44.0696ZM88.6818 19.9856C88.6703 19.9403 88.6585 19.895 88.6463 19.8497C87.074 13.9816 81.0423 10.4992 75.1741 12.0715C69.306 13.6439 65.8236 19.6756 67.396 25.5437C67.9487 27.6066 69.0525 29.3746 70.5066 30.7318C73.2759 29.9864 76.5619 28.6055 79.9084 26.6734C83.5737 24.5572 86.6299 22.1734 88.6818 19.9856ZM88.9174 21.1811C86.8046 23.3085 83.8578 25.5479 80.4084 27.5394C77.267 29.3531 74.1559 30.7031 71.4358 31.5082C74.0425 33.4536 77.4825 34.2291 80.8682 33.3219C86.2928 31.8684 89.6787 26.6041 88.9174 21.1811ZM70.2399 31.8334C73.1424 34.3008 77.1688 35.3484 81.127 34.2878C87.3012 32.6334 91.0545 26.4537 89.7743 20.2733C89.7934 20.252 89.8123 20.2307 89.8312 20.2094C90.8957 19.009 91.6861 17.8423 92.1097 16.7809C92.5307 15.7262 92.62 14.6904 92.1309 13.8432C91.6282 12.9726 90.6483 12.5314 89.481 12.3796C88.3046 12.2266 86.8404 12.3512 85.2039 12.7074C85.089 12.7324 84.9919 12.7952 84.9229 12.8798C82.1158 10.9084 78.4878 10.1484 74.9153 11.1056C69.2346 12.6278 65.6033 17.9808 66.0562 23.6405C65.9019 23.6178 65.7392 23.6674 65.6227 23.7883C64.34 25.1207 63.3746 26.4221 62.8377 27.6002C62.3068 28.7654 62.1508 29.9163 62.686 30.8432C63.1751 31.6904 64.1168 32.131 65.2407 32.2938C66.3717 32.4576 67.7772 32.3564 69.3491 32.0348C69.6395 31.9753 69.9367 31.9081 70.2399 31.8334ZM69.364 31.0098C68.0048 29.5968 66.9734 27.8302 66.43 25.8025C66.3274 25.4194 66.2445 25.0356 66.1807 24.6523C65.0246 25.8777 64.1988 27.025 63.7477 28.0148C63.2699 29.0633 63.256 29.8305 63.552 30.3432C63.8223 30.8113 64.4038 31.1621 65.384 31.3041C66.3572 31.445 67.6369 31.3644 69.1486 31.0551C69.2199 31.0405 69.2917 31.0254 69.364 31.0098ZM85.8447 13.5961C87.2368 13.3245 88.4265 13.2509 89.352 13.3713C90.38 13.505 90.9871 13.8621 91.2648 14.3432C91.5351 14.8113 91.5481 15.4903 91.181 16.4102C90.8642 17.204 90.2866 18.1145 89.4688 19.0972C88.7758 16.8878 87.494 15.0115 85.8447 13.5961Z'
          />
        </svg>
      )
    },
  }),
  /** 铅笔线 */
  PencilLine: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M12 20h9'></path>
          <path d='M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z'></path>
          <path d='m15 5 3 3'></path>
        </svg>
      )
    },
  }),
  /** 播放中 */
  Playing: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='3'
          stroke-linecap='round'
          aria-hidden='true'
        >
          <line x1='5' y1='18' x2='5' y2='18'>
            <animate attributeName='y2' values='18; 6; 18' keyTimes='0; 0.5; 1' dur='0.9s' begin='0s' repeatCount='indefinite' />
          </line>

          <line x1='12' y1='18' x2='12' y2='18'>
            <animate attributeName='y2' values='18; 6; 18' keyTimes='0; 0.5; 1' dur='0.9s' begin='0.3s' repeatCount='indefinite' />
          </line>

          <line x1='19' y1='18' x2='19' y2='18'>
            <animate attributeName='y2' values='18; 6; 18' keyTimes='0; 0.5; 1' dur='0.9s' begin='0.6s' repeatCount='indefinite' />
          </line>
        </svg>
      )
    },
  }),
  /** 返回 */
  Back: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M9 14 4 9l5-5'></path>
          <path d='M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11'></path>
        </svg>
      )
    },
  }),
  /** 大向上虚线箭头 */
  ArrowBigUpDash: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M9 19h6'></path>
          <path d='M9 15v-3H5l7-7 7 7h-4v3H9z'></path>
        </svg>
      )
    },
  }),
  /** GitHub */
  GitHub: defineComponent({
    render() {
      return (
        <svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' fill='currentColor' viewBox='0 0 16 16'>
          <path d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8' />
        </svg>
      )
    },
  }),
  /** 最小化 */
  Minimize: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M8 3v3a2 2 0 0 1-2 2H3'></path>
          <path d='M21 8h-3a2 2 0 0 1-2-2V3'></path>
          <path d='M3 16h3a2 2 0 0 1 2 2v3'></path>
          <path d='M16 21v-3a2 2 0 0 1 2-2h3'></path>
        </svg>
      )
    },
  }),
  /** 最大化 */
  Maximize: defineComponent({
    render() {
      return (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='64'
          height='64'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <path d='M8 3H5a2 2 0 0 0-2 2v3'></path>
          <path d='M21 8V5a2 2 0 0 0-2-2h-3'></path>
          <path d='M3 16v3a2 2 0 0 0 2 2h3'></path>
          <path d='M16 21h3a2 2 0 0 0 2-2v-3'></path>
        </svg>
      )
    },
  }),
}
