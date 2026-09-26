import { extname } from 'path'

const MIME_MAP: Record<string, string> = {
  // 音频
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.alac': 'audio/mp4',
  '.ape': 'audio/x-ape',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.webm': 'audio/webm',
  '.wma': 'audio/x-ms-wma',
  // 图片（封面缓存用）
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

export function getMimeType(filePath: string, defaultExt = 'application/octet-stream'): string {
  return MIME_MAP[extname(filePath).toLowerCase()] || defaultExt
}

export function getExtname(mimeType: string, defaultExt = ''): string {
  for (const key in MIME_MAP) {
    if (MIME_MAP[key] === mimeType) return key
  }
  return defaultExt
}
