/**
 * 根据背景图片的主要颜色，动态计算前景文字颜色（黑/白）
 * 以确保足够的对比度和可读性
 * 从图片URL中提取主要颜色（简化版：从模糊背景的近似色中计算）
 */
export class DynamicColorAdjuster {
  /**
   * 从图片元素中获取主要色调
   * 注意：实际实现中，这里应该使用更复杂的算法（如颜色量化）
   * 此处为简化版本，通过Canvas获取图片平均颜色
   */
  static async getDominantColorFromImage(imageUrl?: string): Promise<{ color: [number, number, number]; hasImg: boolean }> {
    return new Promise(resolve => {
      const def: [number, number, number] = [102, 126, 234]
      if (!imageUrl) {
        resolve({ color: def, hasImg: false })
        return
      }
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve({ color: def, hasImg: false })
          return
        }

        // 缩小图片以加速处理
        canvas.width = 100
        canvas.height = 100
        ctx.drawImage(img, 0, 0, 100, 100)

        const imageData = ctx.getImageData(0, 0, 100, 100).data
        let r = 0,
          g = 0,
          b = 0

        // 计算平均颜色
        for (let i = 0; i < imageData.length; i += 4) {
          r += imageData[i]
          g += imageData[i + 1]
          b += imageData[i + 2]
        }

        const pixelCount = imageData.length / 4
        resolve({ color: [Math.floor(r / pixelCount), Math.floor(g / pixelCount), Math.floor(b / pixelCount)], hasImg: true })
      }
      img.onerror = () => {
        resolve({ color: def, hasImg: false })
      }
      img.src = imageUrl
    })
  }

  /**
   * 根据背景色计算适合的前景色（黑或白）
   * 使用WCAG 2.0对比度公式的简化判断
   * @param backgroundColor RGB数组 [r, g, b]
   * @returns 前景色应为 'black' 或 'white'
   */
  static getForegroundColor(backgroundColor: [number, number, number]): 'black' | 'white' {
    const [r, g, b] = backgroundColor

    // 计算相对亮度 (Rec. 709)
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

    // 简化判断：较亮背景用黑色文字，较暗背景用白色文字
    // 阈值可调整，0.5是基于中性灰
    // return luminance > 0.5 ? 'black' : 'white'
    return 'white'
  }

  /**
   * 计算高对比度的文字颜色（带透明度调整，用于歌词高亮）
   * @param backgroundColor RGB数组
   * @param isHighlight 是否是高亮的当前歌词行
   */
  static getTextColor(backgroundColor: [number, number, number], isHighlight: boolean = false): string {
    const fgColor = this.getForegroundColor(backgroundColor)

    if (fgColor === 'white') {
      // 深色背景：白色文字
      return isHighlight
        ? 'rgba(255, 255, 255, 1)' // 高亮：纯白
        : 'rgba(255, 255, 255, 0.85)' // 普通：稍透明
    } else {
      // 浅色背景：黑色文字
      return isHighlight
        ? 'rgba(0, 0, 0, 1)' // 高亮：纯黑
        : 'rgba(0, 0, 0, 0.75)' // 普通：稍透明
    }
  }

  /**
   * RGB 转 HSL
   * @param backgroundColor RGB数组
   * @returns
   */
  static rgbToHsl(backgroundColor: [number, number, number]) {
    let [r, g, b] = backgroundColor
    // 1、将 RGB 分量从 [0, 255] 范围归一化到 [0, 1]：
    r /= 255
    g /= 255
    b /= 255
    // 2、计算最大值与最小值
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b)
    // 3、计算亮度 L
    const l = (max + min) / 2
    // 4、计算饱和度 S、色相 H
    let h, s
    // 若 max == min（即为灰色，灰色无色相），则 S = 0、H = 0
    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h! /= 6
    }
    return { h: h! * 360, s: s * 100, l: l * 100 }
  }

  /**
   * 计算亮度 (0-255)如果，L值大于或等于128，建议使用黑色文本
   * @param colorRgb
   * @returns
   */
  static getLuminance(colorRgb: [number, number, number]) {
    const [r, g, b] = colorRgb
    return 0.299 * r + 0.587 * g + 0.114 * b
  }

  // 3. 混合两种颜色 (0-1比例)
  static mixColor(c1: [number, number, number], c2: [number, number, number], ratio: number) {
    return {
      r: Math.round(c1[0] + (c2[0] - c1[0]) * ratio),
      g: Math.round(c1[1] + (c2[1] - c1[1]) * ratio),
      b: Math.round(c1[2] + (c2[2] - c1[2]) * ratio),
    }
  }

  /**
   * 根据主色生成整个界面的主题 CSS 变量
   * @param colorRgb 根据主色生成整个界面的主题 CSS 变量
   * @returns
   */
  static generateThemeCSS(colorRgb: [number, number, number], hasImg?: boolean) {
    const [r, g, b] = colorRgb
    const { h, s, l } = this.rgbToHsl([r, g, b])
    const luminance = this.getLuminance([r, g, b])

    let hlH = (h + 10) % 360
    let hlS = Math.min(s + 10, 100)
    let hlL = Math.min(l + 15, 100)

    if (l < 25) {
      hlS = Math.min(s + 20, 100)
      hlL = Math.min(l + 25, 100)
    } else if (l < 45) {
      hlS = Math.min(s + 15, 100)
      hlL = Math.min(l + 20, 100)
    } else if (l < 70) {
      hlS = Math.min(s + 10, 100)
      hlL = Math.min(l + 15, 100)
    } else {
      hlS = Math.min(s + 20, 100)
      hlL = Math.min(l + 25, 100)
    }

    const btnBg = 'rgba(255, 255, 255, 0.15)'
    const btnBgHover = 'rgba(255, 255, 255, 0.25)'

    const defaultBgGradient = 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)'
    const bgStyle = hasImg ? `hsl(${h}, ${s}%, ${l}%)` : defaultBgGradient
    // console.log(444, luminance, bgStyle, `hsl(${hlH}, ${hlS}%, ${hlL}%)`)

    return {
      // --- 主背景 (保留原色) ---
      '--player-theme-bg': bgStyle,
      // --- 主体文字 (纯白，符合需求) ---
      '--player-text-primary': 'rgba(255, 255, 255, 1)',
      // --- 二级文字 (主体文字加透明度) ---
      '--player-text-secondary': 'rgba(255, 255, 255, 0.8)',
      // --- 歌词普通文字 (比二级文字略亮，方便阅读) ---
      '--player-lyric-text': 'rgba(255, 255, 255, 0.8)',
      // --- 高亮文字 (主视觉锚点) ---
      // '--player-highlight': `hsl(${hlH}, ${hlS}%, ${hlL}%)`,
      '--player-highlight': this.hslToHex(hlH, hlS, hlL),
      // --- 按钮背景色 (与背景区分，能衬出图标) ---
      '--player-btn-bg': btnBg,
      '--player-btn-bg-hover': btnBgHover,
    }
  }

  static hslToHex(h: number, s: number, l: number) {
    // 1. 将饱和度、亮度 从 0-100 归一化到 0-1
    s /= 100
    l /= 100

    // 2. 计算中间变量 c, x, m
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2

    let r, g, b

    if (h >= 0 && h < 60) {
      r = c
      g = x
      b = 0
    } else if (h >= 60 && h < 120) {
      r = x
      g = c
      b = 0
    } else if (h >= 120 && h < 180) {
      r = 0
      g = c
      b = x
    } else if (h >= 180 && h < 240) {
      r = 0
      g = x
      b = c
    } else if (h >= 240 && h < 300) {
      r = x
      g = 0
      b = c
    } else if (h >= 300 && h < 360) {
      r = c
      g = 0
      b = x
    } else {
      r = 0
      g = 0
      b = 0
    }

    // 3. 加上 m，并转换到 0-255 区间
    const rgb = [r, g, b].map(v => Math.round((v + m) * 255))

    // 4. 转换为 16 进制字符串 (#RRGGBB)
    return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('')
  }

  // static hslToRgb(h: number, s: number, l: number) {
  //   s /= 100
  //   l /= 100
  //   const c = (1 - Math.abs(2 * l - 1)) * s
  //   const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  //   const m = l - c / 2
  //   let r, g, b
  //   // ... 同上面的分情况逻辑 ...
  //   return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
  // }
}
