import { statSync, readdirSync } from 'fs'
import { join } from 'path'
import { extname } from 'path'
import { SupportedAudioFormat } from '@metatune/common/utils'
import type { IKnownSong, IScanResult } from '@metatune/common/types'

/**
 * 增量扫描：递归遍历监视目录，与已知歌曲列表比对 size/mtime，
 * 只返回需要（重新）解析的文件，避免全量重扫全库。
 */
export function scanDirs(dirs: string[], known: IKnownSong[]): IScanResult {
  const knownMap = new Map(known.map(v => [v.filePath, v]))
  const seenPaths = new Set<string>()
  const newFiles: string[] = []
  const changedFiles: string[] = []

  const walk = (dir: string) => {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch (error: any) {
      console.error('目录不可读:', dir, error?.message)
      return
    }
    for (const name of entries) {
      const fullPath = join(dir, name)
      let stats
      try {
        stats = statSync(fullPath)
      } catch {
        continue
      }
      if (stats.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (!stats.isFile()) continue
      if (!SupportedAudioFormat.includes(extname(name).slice(1).toLowerCase())) continue

      seenPaths.add(fullPath)
      const prev = knownMap.get(fullPath)
      if (!prev) {
        newFiles.push(fullPath)
      } else if (!prev.isValid || prev.size !== stats.size || prev.mtime !== stats.mtime.getTime()) {
        // 失效歌曲即使文件未变也视为需重新解析，否则文件恢复后 isValid 永远无法翻回 true
        changedFiles.push(fullPath)
      }
    }
  }
  dirs.forEach(walk)

  // 已知但磁盘上已不存在的 → 标记失效
  const removedPaths = known.filter(v => v.isValid && !seenPaths.has(v.filePath)).map(v => v.filePath)

  return { newFiles, changedFiles, removedPaths }
}
