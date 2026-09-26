import type { ISong } from '@metatune/common-v2/types'
import { readdir, stat } from 'fs/promises'
import { parseFile } from 'music-metadata'
import type { IFormat } from 'music-metadata'
import { basename, dirname, extname, join } from 'path'
import type { Stats } from 'fs'
import { fastFileUid, hashBuffer } from './hash'
import { getExtname } from './utils'
import { cache } from './appCache'
import type { ScanFailure, ScanResult } from './types'

/** 支持的音频扩展名（不含点）。原实现经实测屏蔽了解析不出时长/码率的格式 */
export const AudioFormat = ['mp3', 'm4a', 'flac', 'aac', 'wav', 'alac']
const AUDIO_EXTENSIONS = new Set(AudioFormat.map(v => `.${v}`))

/** 目录遍历与元数据解析的并发上限：过高会打满磁盘 IO，过低跑不满 */
const SCAN_CONCURRENCY = 6
const PARSE_CONCURRENCY = 4

/** 无损编码白名单（大小写不敏感） */
const LOSSLESS_CODECS = ['flac', 'wav', 'wave', 'alac', 'ape', 'aiff', 'aif', 'dsd', 'dff', 'dsf']

/** 根据音频参数返回音质等级 */
export function judgeAudioQuality(format: IFormat) {
  const { codec = '', sampleRate = 0, bitsPerSample = 0, bitrate = 0, lossless } = format

  if (lossless || LOSSLESS_CODECS.includes(codec.toLowerCase())) {
    if ((bitsPerSample >= 24 && sampleRate >= 48000) || sampleRate >= 96000) return 'HR'
    return 'SQ'
  }
  if ((codec.toLowerCase() === 'mpeg-4/aac' && bitrate >= 256000) || bitrate >= 300000) return 'HQ'
  return undefined
}

/** 从「歌手 - 歌名」形式的文件名兜底取标题与艺术家 */
export function getBaseInfoFromFileName(fileName = '') {
  const strArr = fileName.split(' - ')
  if (strArr.length >= 2) {
    return { title: strArr[1].trim(), artist: strArr[0].trim() }
  }
  return { title: strArr[0]?.trim(), artist: '' }
}

/** 并发执行，返回与输入等长、同序的结果数组 */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/** 按层展开目录，收集所有音频文件（并发 readdir，比逐个 await 快得多） */
async function collectAudioFiles(roots: string[]): Promise<string[]> {
  const files: string[] = []
  let level = roots

  while (level.length > 0) {
    const scanned = await mapLimit(level, SCAN_CONCURRENCY, async entry => {
      const stats = await stat(entry).catch(() => null)
      if (!stats) return null
      if (stats.isFile()) {
        return AUDIO_EXTENSIONS.has(extname(entry).toLowerCase()) ? { files: [entry], dirs: [] as string[] } : null
      }
      if (!stats.isDirectory()) return null
      const children = await readdir(entry, { withFileTypes: true }).catch(() => [])
      return {
        files: [] as string[],
        dirs: children.filter(c => c.isDirectory() && !c.name.startsWith('.')).map(c => join(entry, c.name)),
      }
    })

    const nextLevel: string[] = []
    for (const item of scanned) {
      if (!item) continue
      files.push(...item.files)
      nextLevel.push(...item.dirs)
    }
    level = nextLevel
  }

  return files
}

/** 把异常翻译成能直接展示给用户的原因 */
function describeError(error: unknown): string {
  const code = (error as NodeJS.ErrnoException)?.code
  if (code === 'ENOENT') return '文件不存在或已被移动'
  if (code === 'EACCES' || code === 'EPERM') return '没有读取权限'
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('Could not determine') || message.includes('Unsupported')) return '不是可解析的音频文件'
  return `解析失败：${message}`
}

/** 解析单个文件。previous 用于继承首次添加时间，避免刷新后 addTime 被重置 */
async function parseOne(filePath: string, stats: Stats, previous?: ISong): Promise<ISong> {
  const [uid, metadata] = await Promise.all([fastFileUid(filePath, stats.size), parseFile(filePath)])

  let albumArt = ''
  const picture = metadata.common.picture?.[0]
  if (picture) {
    // 用图片内容摘要做文件名，同一张封面不会重复落盘
    albumArt = await cache.cover.save(hashBuffer(picture.data) + getExtname(picture.format, '.jpg'), picture.data)
  }

  const lyric = metadata.common.lyrics?.[0]
  const fallback = getBaseInfoFromFileName(basename(filePath, extname(filePath)))

  return {
    uid,
    size: stats.size,
    filePath,
    fileName: basename(filePath),
    folderPath: dirname(filePath),
    title: metadata.common.title || fallback.title,
    artist: metadata.common.artist || fallback.artist,
    album: metadata.common.album || '',
    albumArtist: metadata.common.albumartist || '',
    year: metadata.common.year,
    duration: metadata.format.duration || 0,
    bitrate: metadata.format.bitrate,
    sampleRate: metadata.format.sampleRate,
    bitsPerSample: metadata.format.bitsPerSample,
    container: metadata.format.container,
    codec: metadata.format.codec,
    albumArt,
    lyrics: lyric?.syncText || lyric?.text || '',
    qualityFlag: judgeAudioQuality(metadata.format),
    isValid: true,
    mtime: Math.trunc(stats.mtimeMs),
    // 重新解析说明内容变了，但仍沿用首次导入时间，排序才不会乱跳
    addTime: previous?.addTime ?? Date.now(),
  }
}

export interface ScanOptions {
  /** 已缓存歌曲（filePath -> song），mtime 与 size 都没变则直接复用，不重新解析 */
  cache?: Map<string, ISong>
}

/**
 * 扫描给定路径（文件或文件夹），返回解析结果与失败明细。
 *
 * 增量逻辑是这里的关键：刷新列表时把已有歌曲的 mtime/size 传进来，
 * 只有新增文件和内容确实变过的文件才会走解析，曲库越大省得越多。
 */
export async function scanPaths(paths: string[], options: ScanOptions = {}): Promise<ScanResult> {
  const files = await collectAudioFiles(paths)
  const { cache: cachedSongs } = options

  const outcomes = await mapLimit(files, PARSE_CONCURRENCY, async filePath => {
    const previous = cachedSongs?.get(filePath)
    try {
      const stats = await stat(filePath)
      // 大小与修改时间都没变 → 内容与上次一致，直接复用缓存对象
      if (previous && previous.size === stats.size && previous.mtime === Math.trunc(stats.mtimeMs)) {
        return { kind: 'skipped' as const, song: previous }
      }
      return { kind: 'parsed' as const, song: await parseOne(filePath, stats, previous) }
    } catch (error) {
      return { kind: 'failed' as const, failure: { filePath, reason: describeError(error) } }
    }
  })

  const songs: ISong[] = []
  const failures: ScanFailure[] = []
  let parsed = 0
  let skipped = 0

  for (const outcome of outcomes) {
    if (outcome.kind === 'failed') failures.push(outcome.failure)
    else {
      songs.push(outcome.song)
      if (outcome.kind === 'parsed') parsed++
      else skipped++
    }
  }

  return { songs, failures, parsed, skipped }
}
