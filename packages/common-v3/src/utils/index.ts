import { IArtist, ISong } from '../types'
import { SortTypeItems, SortTypeItemsIds } from './constant'
import { isReactive, isRef, toRaw } from 'vue'

export * from './clsx'
export * from './colorUtils'
export * from './constant'
export * from './lyricParser'
export * from './svgIcons'

// 点击外部关闭菜单的指令
export const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    // @ts-expect-error 不需要检测
    el._clickOutside = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    // @ts-expect-error 不需要检测
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el: HTMLElement) {
    // @ts-expect-error 不需要检测
    document.removeEventListener('click', el._clickOutside)
  },
}

/**
 * 深度移除响应式引用（递归剥离所有 Proxy/Ref）
 * @param source 原始响应式数据
 * @returns 纯 JS 对象/数组
 */
export function deepToRaw<T>(source: T): T {
  if (source === null || typeof source !== 'object') return source

  // 1️⃣ 剥离当前层的 ref/reactive 包装
  const raw = isRef(source) || isReactive(source) ? toRaw(source) : source

  // 2️⃣ 数组递归
  if (Array.isArray(raw)) {
    return raw.map(item => deepToRaw(item)) as T
  }

  // 3️⃣ 特殊对象类型处理
  if (raw instanceof Date) return new Date(raw.getTime()) as T
  if (raw instanceof RegExp) return new RegExp(raw.source, raw.flags) as T
  if (raw instanceof Map) {
    const m = new Map()
    raw.forEach((v, k) => m.set(k, deepToRaw(v)))
    return m as T
  }
  if (raw instanceof Set) {
    const s = new Set()
    raw.forEach(v => s.add(deepToRaw(v)))
    return s as T
  }

  // 4️⃣ 普通对象递归
  const result: any = {}
  for (const key in raw) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      result[key] = deepToRaw(raw[key])
    }
  }
  return result as T
}

/**
 * 获取字符的排序优先级（数字越小越靠前，按首字符）
 * 1: 英文字母 (A-Z)
 * 2: 中文（简体+繁体）
 * 3: 数字 (0-9)
 * 4: 其他所有字符（特殊符号/其他语言）
 */
export function getCharPriority(char: string): number {
  if (!char) return 4

  const firstChar = char.charAt(0)
  const code = char.charCodeAt(0)

  // 1️⃣ 英文字母 A-Z / a-z
  if (/[a-zA-Z]/.test(firstChar)) {
    return 1
  }

  // 2️⃣ 中文（简体 + 繁体 + 扩展）
  if (
    (code >= 0x4e00 && code <= 0x9fff) || // 基本汉字
    (code >= 0x3400 && code <= 0x4dbf) // 扩展A
    // (code >= 0xf900 && code <= 0xfaff) // 兼容汉字
  ) {
    return 1 // 中英文混排
  }

  // 3️⃣ 数字 0-9
  if (/[0-9]/.test(firstChar)) {
    return 3
  }

  // 4️⃣ 其他：特殊符号 / 日文 / 韩文 / 俄文 / 表情等
  return 4
}

/**
 * 判断首个字符是否为中文（简体 + 繁体 + 常用扩展）
 * @param char 单个字符
 * @returns boolean
 */
export function isChineseChar(char: string): boolean {
  if (!char) return false

  const code = char.charCodeAt(0)

  // 1️⃣ 基本汉字区（覆盖 99% 常用简繁中文）
  // \u4E00 - \u9FFF：CJK Unified Ideographs
  if (code >= 0x4e00 && code <= 0x9fff) return true

  // 2️⃣ 扩展A区（较少用，但包含部分繁体）
  // \u3400 - \u4DBF：CJK Unified Ideographs Extension A
  if (code >= 0x3400 && code <= 0x4dbf) return true

  // 3️⃣ 兼容汉字区（部分繁体/日文汉字）
  // \uF900 - \uFAFF：CJK Compatibility Ideographs
  // if (code >= 0xf900 && code <= 0xfaff) return true

  // 4️⃣ 部首/笔画补充（可选，按需启用）
  // \u2E80 - \u2EFF：CJK Radicals Supplement
  // \u31C0 - \u31EF：CJK Strokes
  // if ((code >= 0x2e80 && code <= 0x2eff) || (code >= 0x31c0 && code <= 0x31ef)) {
  //   return true
  // }

  return false
}

const collator = new Intl.Collator('zh-CN', {
  collation: 'pinyin', // 显式启用拼音排序规则（需浏览器支持 ICU 的拼音扩展）。
  sensitivity: 'base', // 忽略大小写和音调差异（如 "Zhāng" 和 "zhang" 视为相同）。
  numeric: true, // 确保数字按数值排序（如 "第2名" 排在 "第10名" 前）。
})
// 1. 完整锚点数组（为 26 个字母各准备一个锚点）
const anchorChars = [
  '吖', // A
  '八', // B
  '嚓', // C
  '咑', // D
  '妸', // E
  '发', // F
  '旮', // G
  '哈', // H
  '讥', // I  <-- 新增，解决 I 缺失问题
  '讥', // J
  '咔', // K
  '垃', // L
  '妈', // M
  '拏', // N
  '喔', // O
  '妑', // P
  '七', // Q
  '呥', // R
  '仨', // S
  '他', // T
  '屲', // U  <-- 新增，解决 U 缺失问题
  '屲', // V  <-- 新增，解决 V 缺失问题
  '屲', // W
  '夕', // X
  '丫', // Y
  '帀', // Z
]
// 2. 对应的字母标签数组（确保索引一一对应）
const alphabet = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
]
/** 获取字符串的首字母（支持中文、英文、数字、特殊字符） */
export function getFirstLetter(str: string, isValid: boolean): string {
  if (!str || !isValid) return '#'
  const firstChar = str.charAt(0)
  if (/[a-zA-Z]/.test(firstChar)) return firstChar.toUpperCase()
  if (/[0-9]/.test(firstChar)) return '#'

  if (isChineseChar(firstChar)) {
    let idx = alphabet.length
    for (let i = 0; i < anchorChars.length; i++) {
      // 找到第一个锚点 > 当前字符
      // compareFunction(a, b) 小于 0 ，那么 a 会被排列到 b 之前
      // compareFunction(a, b) 大于 0 ，那么 a 会被排列到 b 之后
      if (collator.compare(firstChar, anchorChars[i]) < 0) {
        idx = i
        break
      }
    }
    if (idx === 0) return 'A'
    if (idx === alphabet.length) return 'Z'
    return alphabet[idx - 1]
  }

  return '#'
}

const zhCollator = new Intl.Collator('zh-CN', {
  collation: 'pinyin',
  sensitivity: 'case', // 严格区分大小写
  caseFirst: 'lower', // 小写字母优先于大写字母（核心配置）
  numeric: true, // 数字按数值大小排序（'2' < '10'）
  ignorePunctuation: false, // 严格比较标点符号（按需改为 true）
})
export function sortSong(songs: ISong[], type: SortTypeItemsIds = SortTypeItems[0].value) {
  if (type === 'addTime') {
    songs.sort((a, b) => {
      const aValue = a.addTime || 0,
        bValue = b.addTime || 0
      // 数字比较
      // return sortOrder.value === 'asc' ? aValue - bValue : bValue - aValue
      return aValue - bValue
    })

    return songs.sort((a, b) => Number(b.isValid) - Number(a.isValid))
  }
  // 1️⃣ 根据首字符分割成英文、中文、数字、其他四个大组
  const en_list: ISong[] = []
  const cn_list: ISong[] = []
  const num_list: ISong[] = []
  const symbol_list: ISong[] = []
  songs.forEach(v => {
    // @ts-expect-error 不需要检测
    const name = v[type]?.trim() || ''
    const first = name.charAt(0)
    if (/[a-zA-Z]/.test(first)) {
      en_list.push(v)
    } else if (isChineseChar(name)) {
      cn_list.push(v)
    } else if (/[0-9]/.test(first)) {
      num_list.push(v)
    } else {
      symbol_list.push(v)
    }
  })
  // 2️⃣ 将英文、中文大组按a-z分割成小组
  const en_list_letter: ISong[][] = []
  const cn_list_letter: ISong[][] = []
  alphabet.forEach((v, i) => {
    en_list_letter[i] = []
    en_list.forEach(w => {
      // @ts-expect-error 不需要检测
      const name = w[type]?.trim() || ''
      const first = name.charAt(0)
      if (first.toUpperCase() === v) {
        en_list_letter[i].push(w)
      }
    })
    cn_list_letter[i] = []
    cn_list.forEach(w => {
      // @ts-expect-error 不需要检测
      const name = w[type]?.trim() || ''
      const first = getFirstLetter(name, w.isValid)
      if (first.toUpperCase() === v) {
        cn_list_letter[i].push(w)
      }
    })
  })
  // 3️⃣ 对各分组进行排序
  ;[en_list_letter, cn_list_letter].forEach(u => {
    u.forEach(v => {
      v.sort((a, b) => {
        // @ts-expect-error 不需要检测
        const aValue: string = a[type]?.trim(),
          // @ts-expect-error 不需要检测
          bValue: string = b[type]?.trim()
        // return sortOrder.value === 'asc' ? aValue.localeCompare(bValue, 'zh-CN') : bValue.localeCompare(aValue, 'zh-CN')
        return zhCollator.compare(aValue, bValue)
      })
    })
  })
  ;[num_list, symbol_list].forEach(v => {
    v.sort((a, b) => {
      // @ts-expect-error 不需要检测
      const aValue: string = a[type]?.trim(),
        // @ts-expect-error 不需要检测
        bValue: string = b[type]?.trim()
      // return sortOrder.value === 'asc' ? aValue.localeCompare(bValue, 'zh-CN') : bValue.localeCompare(aValue, 'zh-CN')
      return zhCollator.compare(aValue, bValue)
    })
  })
  // 4️⃣ 合并排序后的各组
  let newArr: ISong[] = []
  alphabet.forEach((_v, i) => {
    newArr = newArr.concat(en_list_letter[i], cn_list_letter[i])
  })
  newArr = newArr.concat(num_list, symbol_list)

  // v3 修复：字母匹配阶段被遗漏的歌曲（如 isValid=false 的中文歌，getFirstLetter 返回 '#'，
  // 落不进任何字母组）统一追加，避免从视图里消失；末尾排序会把无效歌曲排到后面
  const kept = new Set(newArr)
  const missed = songs.filter(v => !kept.has(v))
  if (missed.length > 0) {
    console.log('[sortSong] 追加被字母分组遗漏的歌曲:', missed.length)
    newArr = newArr.concat(missed)
  }

  return newArr.sort((a, b) => Number(b.isValid) - Number(a.isValid))
}

export function mergeSong(target: ISong[], source: ISong[]) {
  // 若有文件路径未变，但uid变了，记录下来 {旧uid: 新uid}
  const idMap: Record<string, string> = {}
  // v3 优化：用 Map 索引替代每首 findIndex，导入大曲库时 O(n²) → O(n)
  const uidIndex = new Map<string, number>()
  const pathIndex = new Map<string, number>()
  target.forEach((s, i) => {
    uidIndex.set(s.uid, i)
    pathIndex.set(s.filePath, i)
  })

  source.forEach(v => {
    // uid 未变但路径变了（文件被移动）
    const uidIdx = uidIndex.get(v.uid)
    if (uidIdx !== undefined && v.filePath !== target[uidIdx].filePath) {
      pathIndex.delete(target[uidIdx].filePath)
      target[uidIdx] = v
      pathIndex.set(v.filePath, uidIdx)
      return
    }

    // 路径未变但 uid 变了（文件内容更新）
    const pathIdx = pathIndex.get(v.filePath)
    if (pathIdx !== undefined && v.uid !== target[pathIdx].uid) {
      idMap[target[pathIdx].uid] = v.uid
      uidIndex.delete(target[pathIdx].uid)
      target[pathIdx] = v
      uidIndex.set(v.uid, pathIdx)
      return
    }

    // 新增的
    if (uidIdx === undefined && pathIdx === undefined) {
      uidIndex.set(v.uid, target.length)
      pathIndex.set(v.filePath, target.length)
      target.push(v)
    }
  })

  return { target, idMap }
}

/** 秒数格式化为 m:ss */
export function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 将字节转换为人类可读格式
 * @param bytes - 文件大小（字节）
 * @param decimals - 小数位数，默认 2
 * @returns 格式化后的字符串，如 "1.25 MB"
 */
export function formatFileSize(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 B'
  if (!bytes || bytes < 0) return 'Invalid size'

  const k = 1024 // 二进制标准（文件系统常用）
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))

  return `${value} ${sizes[i]}`
}

export const sortArtist = <T = IArtist>(arr: T[]) => {
  arr.sort((a: any, b: any) => {
    const aValue = a.name,
      bValue = b.name
    return zhCollator.compare(aValue, bValue)
  })

  return arr as T[]
}

/**
 * 绘制顶部圆角、底部直角的矩形
 * @param ctx Canvas 2D 上下文
 * @param x 左上角 X 坐标
 * @param y 左上角 Y 坐标
 * @param width 宽度
 * @param height 高度
 * @param radius 圆角半径（仅作用于顶部两角）
 */
export function roundRectTopOnly(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  // 边界处理：半径不能超过宽度一半
  const r = Math.min(radius, width / 2)

  ctx.beginPath()

  // 1️⃣ 从左下角开始（逆时针绘制，方便闭合）
  ctx.moveTo(x, y + height)

  // 2️⃣ 左侧边 → 左上角圆角
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r) // 左上角

  // 3️⃣ 顶部边 → 右上角圆角
  ctx.lineTo(x + width - r, y)
  ctx.arcTo(x + width, y, x + width, y + r, r) // 右上角

  // 4️⃣ 右侧边 → 右下角直角
  ctx.lineTo(x + width, y + height)

  // 5️⃣ 底部边闭合（直角）
  ctx.lineTo(x, y + height)
  ctx.closePath()
}

/**
 * 向当前 Canvas Path 添加一个"顶部圆角、底部直角"的矩形子路径
 * ⚠️ 注意：不会调用 beginPath()，需由调用者统一管理路径生命周期
 *
 * @param ctx Canvas 2D 上下文
 * @param x 矩形左上角 X 坐标（CSS 像素）
 * @param y 矩形左上角 Y 坐标（CSS 像素）
 * @param width 矩形宽度
 * @param height 矩形高度
 * @param radius 顶部圆角半径
 */
export function addRoundedTopSubpath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  if (width <= 0 || height <= 0) return

  // 边界处理：半径不能超过宽度一半，也不能超过高度
  const r = Math.min(radius, width / 2, height)

  // 🔑 关键：用 moveTo 开始新子路径（不影响已有路径）
  ctx.moveTo(x, y + height) // 起点：左下角

  // 左侧边 → 左上角圆角
  ctx.lineTo(x, y + r)
  if (r > 0) {
    ctx.arcTo(x, y, x + r, y, r) // 左上角：控制点(左上角), 终点(右上偏移)
  }

  // 顶部边 → 右上角圆角
  ctx.lineTo(x + width - r, y)
  if (r > 0) {
    ctx.arcTo(x + width, y, x + width, y + r, r) // 右上角
  }

  // 右侧边 → 右下角（直角）
  ctx.lineTo(x + width, y + height)

  // 底部边闭合（直角，先不 closePath，等所有子路径加完再统一闭合）
  ctx.lineTo(x, y + height)

  // ⚠️ 不调用 closePath()！由调用者批量处理后统一闭合
}

/**
 * 将 TypedArray 按隔一留一降采样为一半长度
 */
export function downsampleHalf<T extends Float32Array | Uint8Array>(typedArray: T, odd = false) {
  const olen = typedArray.length
  const nlen = Math.floor(typedArray.length / 2)
  const st = odd ? 1 : 0
  const Constructor = typedArray.constructor as new (length: number) => T
  const result = new Constructor(nlen)
  for (let i = st, j = 0; i < olen; i += 2, j++) {
    result[j] = typedArray[i]
  }
  return result
}
