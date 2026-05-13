import { ILyricsText, ILyricLine } from '@/types'

/** 歌词解析器 */
export class LyricParser {
  /**
   * 解析LRC格式歌词
   * @param lyricsData music-metadata 返回的 lyrics 数据
   */
  static parseLRC(lyricsData: ILyricsText[] | string): ILyricLine[] {
    const lines: ILyricLine[] = []
    if (typeof lyricsData === 'string') {
      const textLines = lyricsData.split('\n')

      for (const line of textLines) {
        // 匹配时间标签，如 [mm:ss.xx] 或 [mm:ss]
        const timeMatch = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/)
        if (!timeMatch) continue

        const minutes = parseInt(timeMatch[1], 10)
        const seconds = parseInt(timeMatch[2], 10)
        const milliseconds = timeMatch[3] ? parseInt(timeMatch[3].padEnd(3, '0'), 10) : 0

        const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000

        // 获取时间标签后的歌词文本
        const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim()

        if (text) {
          lines.push({ time: timeInSeconds, text })
        }
      }

      // 按时间排序
      lines.sort((a, b) => a.time - b.time)
      return lines
    }

    if (lyricsData && lyricsData.length > 0) {
      return lyricsData.map(item => ({
        time: (item.timestamp || 0) / 1000, // 毫秒 → 秒
        text: item.text.trim(),
      }))
    }

    return []
  }

  /**
   * 解析TXT格式歌词（简单的逐行歌词）
   * @param txtText 纯文本歌词
   * @param interval 每行歌词间隔时间(秒)，默认5秒
   */
  static parseTXT(txtText: string, interval: number = 5): ILyricLine[] {
    const lines: ILyricLine[] = []
    const textLines = txtText.split('\n')

    let currentTime = 0
    for (const text of textLines) {
      if (text.trim()) {
        lines.push({ time: currentTime, text: text.trim() })
        currentTime += interval
      }
    }
    return lines
  }

  /**
   * 根据当前播放时间，获取当前应显示的歌词行
   * @param lyricLines 解析后的歌词行数组
   * @param currentTime 当前播放时间(秒)
   */
  static getCurrentLyric(
    lyricLines: ILyricLine[],
    currentTime: number
  ): { currentLine: ILyricLine | null; currentIndex: number; nextLine: ILyricLine | null } {
    if (!lyricLines.length) {
      return { currentLine: null, currentIndex: -1, nextLine: null }
    }

    // 找到第一个时间点大于currentTime的歌词行，其前一行即为当前行
    let currentIndex = -1
    for (let i = 0; i < lyricLines.length; i++) {
      if (lyricLines[i].time > currentTime) {
        currentIndex = i - 1
        break
      }
    }

    // 如果所有行的时间都小于currentTime，则最后一行是当前行
    if (currentIndex === -1 && lyricLines[lyricLines.length - 1].time <= currentTime) {
      currentIndex = lyricLines.length - 1
    }

    const currentLine = currentIndex >= 0 ? lyricLines[currentIndex] : null
    const nextLine = currentIndex + 1 < lyricLines.length ? lyricLines[currentIndex + 1] : null

    return { currentLine, currentIndex, nextLine }
  }
}
