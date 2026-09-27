import { extname } from 'path'
import { md5 } from 'js-md5'

const mimeMap: Record<string, string> = {
  // 音频类
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.alac': 'audio/mp4',
  // 图片类
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

export function getMimeType(filePath: string, defaultExt = 'application/octet-stream'): string {
  const ext = extname(filePath).toLowerCase()
  return mimeMap[ext] || defaultExt
}

export function getExtname(mimeType: string, defaultExt = ''): string {
  let ext = defaultExt
  for (const key in mimeMap) {
    if (mimeMap[key] === mimeType) {
      ext = key
      break
    }
  }
  return ext
}

/** 计算二进制数据 MD5（用于封面去重） */
export function calculateMD5(data: ArrayBuffer | Uint8Array): string {
  return md5(data)
}

/** 计算字符串 MD5（用于歌曲 uid 生成） */
export function calculateTextMD5(text: string): string {
  return md5(text)
}
