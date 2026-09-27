import { ILyricsText, ISong } from '@metatune/common-v3/types'
import type { IImportResult, OnProgress } from '@metatune/common-v3/types'
import { readdirSync, statSync } from 'fs'
import { parseFile } from 'music-metadata'
import type { IFormat } from 'music-metadata'
import { basename, dirname, extname, join } from 'path'
import { calculateMD5, calculateTextMD5, getExtname } from './utils'
import { cache } from './appCache'

// 支持的音频格式
export const AudioFormat = [
  'mp3', //codec: "MPEG 1 Layer 3"; container: "MPEG"
  'm4a', //codec: "MPEG-4/AAC"; container: "M4A/isom/iso2"
  'flac', //codec: "FLAC"; container: "FLAC"
  'aac',
  'wav',
  // 'ape', //疑似需 FFmpeg / JS 软解
  // 'alac',
  // 'ogg', //codec: "Opus"; container: "Ogg"   疑似无法解析出时长、比特率信息，不予支持
  // 'opus',
  // 'webm', //codec: "OPUS"; container: "EBML/webm"   疑似无法解析出比特率信息，不予支持
  // 'wma', //codec: "Windows Media Audio 9"; container: "ASF/audio"   浏览器不支持，需软解，不予支持
]

/** 无损编码白名单（大小写不敏感） */
const LOSSLESS_CODECS = ['flac', 'wav', 'wave', 'alac', 'ape', 'aiff', 'aif', 'dsd', 'dff', 'dsf']

/** 根据音频参数判定音质等级 */
export function judgeAudioQuality(format: IFormat) {
  const { codec = '', sampleRate = 0, bitsPerSample = 0, bitrate = 0, lossless } = format

  // 1. 先判断是否为无损编码
  if (lossless || LOSSLESS_CODECS.includes(codec.toLowerCase())) {
    // 2. 无损编码中判断 Hi-Res
    if ((bitsPerSample >= 24 && sampleRate >= 48000) || sampleRate >= 96000) return 'HR'
    // 3. 其他无损判为 SQ
    return 'SQ'
  }
  // 4. 有损编码按码率判断
  if ((codec.toLowerCase() === 'mpeg-4/aac' && bitrate >= 256000) || bitrate >= 300000) return 'HQ'
  return undefined
}

export function getBaseInfoFromFileName(fileName = '') {
  const strArr = fileName.split(' - ')
  if (strArr.length >= 2) {
    return { title: strArr[1].trim(), artist: strArr[0].trim() }
  }
  return { title: strArr[0]?.trim(), artist: '' }
}

/**
 * uid 生成（v3 优化）：
 * 原版对整个文件内容做 MD5，导入时需全量读盘+哈希，大无损文件极慢。
 * v3 改为 md5(路径|大小|修改时间)：
 *  - 路径唯一 → 不同文件不碰撞；大小/修改时间 → 同路径文件变更后 uid 变化
 *  - 增量扫描可据此检测变更（配合 audioScanner 的 size/mtime 对比）
 */
export function computeSongUid(filePath: string, size: number, mtime: number): string {
  return calculateTextMD5(`${filePath}|${size}|${mtime}`)
}

/** 解析单个音频文件，失败抛出异常由批量流程收集 */
async function parseSingleFile(filePath: string): Promise<ISong> {
  const stats = statSync(filePath)
  const fileName = basename(filePath)
  const extName = extname(filePath)

  // music-metadata 内部自行读文件，无需再 readFile 全量读盘
  const metadata = await parseFile(filePath)

  // 提取专辑图片（按图片内容 MD5 去重落盘）
  let albumArt = ''
  if (metadata.common.picture && metadata.common.picture.length > 0) {
    const picture = metadata.common.picture[0]
    const albumArtMd5 = picture ? calculateMD5(picture.data) : ''
    if (albumArtMd5) {
      albumArt = await cache.cover.save(albumArtMd5 + getExtname(picture.format), picture.data)
    }
  }

  // 提取歌词
  let lyrics: ILyricsText[] | string = ''
  if (metadata.common.lyrics && metadata.common.lyrics.length > 0) {
    lyrics = metadata.common.lyrics[0].syncText || metadata.common.lyrics[0].text || ''
  }

  const temp = getBaseInfoFromFileName(basename(filePath, extName))
  return {
    uid: computeSongUid(filePath, stats.size, stats.mtime.getTime()),
    size: stats.size,
    filePath,
    fileName,
    folderPath: dirname(filePath),
    title: metadata.common.title || temp.title,
    artist: metadata.common.artist || temp.artist,
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
    lyrics,
    qualityFlag: judgeAudioQuality(metadata.format),
    isValid: true,
    mtime: stats.mtime.getTime(),
    addTime: Date.now(),
  } as ISong
}

/**
 * 批量解析：支持文件与目录混合（目录递归展开），带并发池与进度回调。
 * 并发数 4：机械盘下避免磁头乱跳，SSD 下也能吃满 IO。
 */
export async function parsePaths(paths: string[], onProgress?: OnProgress, concurrency = 4): Promise<IImportResult> {
  // 1. 展开目录、分离非音频文件
  const audioFiles: string[] = []
  const skipped: string[] = []
  const stack = [...paths]
  const visited = new Set<string>()
  while (stack.length > 0) {
    const p = stack.pop()!
    if (visited.has(p)) continue
    visited.add(p)
    try {
      const stats = statSync(p)
      if (stats.isDirectory()) {
        for (const name of readdirSync(p)) stack.push(join(p, name))
      } else if (AudioFormat.includes(extname(p).slice(1).toLowerCase())) {
        audioFiles.push(p)
      } else {
        skipped.push(p)
      }
    } catch (error: any) {
      skipped.push(p)
      console.error('读取路径失败:', p, error?.message)
    }
  }

  // 2. 并发解析
  const result: IImportResult = { songs: [], errors: [], skipped }
  let done = 0
  const total = audioFiles.length
  let cursor = 0

  const worker = async () => {
    while (cursor < audioFiles.length) {
      const filePath = audioFiles[cursor++]
      try {
        result.songs.push(await parseSingleFile(filePath))
      } catch (error: any) {
        console.error('解析失败:', filePath, error?.message)
        result.errors.push({ filePath, reason: error?.message || String(error) })
      }
      done++
      onProgress?.(done, total, basename(filePath))
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, audioFiles.length) }, worker))

  return result
}
