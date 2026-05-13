import { ISong, ILyricsText } from '@metatune/common/types'
import { readdir, statSync } from 'fs'
import { readFile } from 'fs/promises'

import { parseFile } from 'music-metadata'
import type { IFormat } from 'music-metadata'
import { basename, dirname, extname, join } from 'path'
import { calculateMD5, getExtname, uint8ArrayToBase64 } from './utils'
import { cache } from './appCache'

// MPEG-4/AAC、、MPEG 1 Layer 3
export const AudioFormat = [
  'mp3',
  'm4a',
  'flac',
  'aac',
  'wav',
  'ape', //疑似需 FFmpeg / JS 软解
  'alac',
  'ogg',
  'opus',
  'webm',
  'wma', //疑似浏览器不支持，需软解
]

/**
 * 无损编码格式白名单（大小写不敏感）
 */
const LOSSLESS_CODECS = ['flac', 'wav', 'wave', 'alac', 'ape', 'aiff', 'aif', 'dsd', 'dff', 'dsf']
/**
 * 根据音频参数返回音质等级
 */
export const judgeAudioQuality = (format: IFormat) => {
  const { codec = '', sampleRate = 0, bitsPerSample = 0, bitrate = 0, lossless } = format

  // 1. 先判断是否为无损编码
  if (lossless || LOSSLESS_CODECS.includes(codec.toLowerCase())) {
    // 2. 无损编码中判断 Hi-Res
    if ((bitsPerSample >= 24 && sampleRate >= 48000) || sampleRate >= 96000) {
      return 'HR'
    }
    // 3. 其他无损判为 SQ
    return 'SQ'
  }

  // 4. 有损编码按码率判断
  // MPEG-4/AAC
  if ((codec.toLowerCase() === 'mpeg-4/aac' && bitrate >= 256000) || bitrate >= 300000) {
    return 'HQ'
  }
  return undefined
}

export const getBaseInfoFromFileName = (fileName: string = '') => {
  const strArr = fileName.split('-')
  if (strArr.length >= 2) {
    return {
      title: strArr[1].trim(),
      artist: strArr[0].trim(),
    }
  } else {
    return {
      title: strArr[0]?.trim(),
      artist: '',
    }
  }
}

export const parseMetadata = async (filePath: string): Promise<ISong[] | null> => {
  const stats = statSync(filePath)
  const fileName = basename(filePath)
  const extName = extname(filePath)
  const currTime = Date.now()
  console.log('文件', fileName, extName)
  console.log('文件信息', stats)
  if (stats.isFile() && AudioFormat.includes(extName.slice(1))) {
    try {
      const [fileData, metadata] = await Promise.all([readFile(filePath), parseFile(filePath)])
      const fileMD5 = calculateMD5(fileData)
      console.log('媒体信息', metadata)
      // 提取专辑图片
      let albumArt = ''
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0]
        const albumArtMd5 = picture ? calculateMD5(picture.data) : ''
        const ext = getExtname(picture.format)
        if (albumArtMd5) {
          albumArt = await cache.cover.save(albumArtMd5 + ext, picture.data)
        }

        // albumArt = `data:${picture.format};base64,${uint8ArrayToBase64(picture.data)}`;
        // albumArt = `cache://${picture.format};base64,${uint8ArrayToBase64(picture.data)}`;
      }
      // 提取歌词
      let lyrics: ILyricsText[] | string = ''
      if (metadata.common.lyrics && metadata.common.lyrics.length > 0) {
        lyrics = metadata.common.lyrics[0].syncText || metadata.common.lyrics[0].text || ''
      }
      const temp = getBaseInfoFromFileName(basename(filePath, extName))
      return [
        {
          uid: fileMD5,
          size: stats.size,
          filePath,
          fileName: fileName,
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
          addTime: currTime,
        },
      ] as ISong[]
    } catch (error) {
      console.error(`Failed to parse ${filePath}:`, error)
      // const temp = getBaseInfoFromFileName(basename(filePath, extname(filePath)))
      // // 返回基础信息
      // results.push({
      //     size: stats.size,
      //     filePath,
      //     fileName: fileName,
      //     title: temp.title,
      //     artist: temp.artist || '未知歌手',
      //     album: '未知专辑',
      //     // duration: metadata.format.duration || 0,
      // });
      return null
    }
  } else if (stats.isDirectory()) {
    const fun = (_pathN: string) => {
      return new Promise<ISong[] | null>((resolve, reject) => {
        readdir(_pathN, async (err, files) => {
          if (err) {
            resolve(null)
            return
          }
          const results: ISong[] = []
          for (let i = 0; i < files.length; i++) {
            const result = await parseMetadata(join(_pathN, files[i]))
            if (result) results.push(...result)
          }
          resolve(results)
        })
      })
    }
    return await fun(filePath)
  }
  return null
}
