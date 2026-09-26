import { protocol } from 'electron'
import { createReadStream, statSync } from 'fs'
import { randomUUID } from 'crypto'
import { getMimeType } from './utils'

/**
 * 音频流协议：取代原来的「本机 Express HTTP 服务」。
 *
 * 原实现把文件路径直接拼进 URL（/stream/<encodeURIComponent(filePath)>），
 * 任何能访问 localhost:1688 的人都能读本机任意文件，且 cors() 全开。
 *
 * 现在改为：渲染进程只能拿到主进程签发的、随机的一次性 token，
 * token → 文件路径的映射只存在于主进程内存中，外部无法枚举、无法伪造。
 * 顺带省掉端口占用、CORS 预检和一层 HTTP 栈。
 */

interface StreamEntry {
  filePath: string
  mime: string
  expireAt: number
}

/** token -> 授权条目。只在主进程内存里，不落盘 */
const tokens = new Map<string, StreamEntry>()
/** token 有效期：够 Howler 完成加载与后续 Range 请求即可 */
const TTL = 30 * 60 * 1000

/** 只服务音频，其它类型一律拒绝（防止 token 被滥用于读任意文件） */
const isAudioMime = (mime: string) => mime.startsWith('audio/') || mime === 'application/octet-stream'

/**
 * 为一个已确认属于曲库的文件签发访问 token。
 * 调用方必须先校验 filePath 合法，这里只负责发放。
 */
export function issueMediaToken(filePath: string): string {
  // 顺手清理过期项，避免长时间运行后 Map 无限增长
  if (tokens.size > 64) {
    const now = Date.now()
    for (const [key, entry] of tokens) {
      if (entry.expireAt < now) tokens.delete(key)
    }
  }

  const mime = getMimeType(filePath)
  if (!isAudioMime(mime)) return ''

  const token = randomUUID().replace(/-/g, '')
  tokens.set(token, { filePath, mime, expireAt: Date.now() + TTL })
  return `media://stream/${token}`
}

export function registerMediaProtocol() {
  protocol.handle('media', async request => {
    const token = new URL(request.url).pathname.replace(/^\/+/, '')
    const entry = tokens.get(token)
    if (!entry) return new Response('Not Found', { status: 404 })
    if (entry.expireAt < Date.now()) {
      tokens.delete(token)
      return new Response('Gone', { status: 410 })
    }

    let size: number
    try {
      size = statSync(entry.filePath).size
    } catch {
      // 文件已被删除或移走
      tokens.delete(token)
      return new Response('Not Found', { status: 404 })
    }

    const baseHeaders: Record<string, string> = {
      'Content-Type': entry.mime,
      'Accept-Ranges': 'bytes',
      // Howler 用 XHR 跨源加载，需要显式放行
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    }

    const range = request.headers.get('Range')
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
      if (!match) return new Response('Range Not Satisfiable', { status: 416, headers: baseHeaders })

      const start = match[1] ? Number(match[1]) : 0
      const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
        return new Response('Range Not Satisfiable', { status: 416, headers: baseHeaders })
      }

      return new Response(createReadStream(entry.filePath, { start, end }) as never, {
        status: 206,
        headers: { ...baseHeaders, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
      })
    }

    return new Response(createReadStream(entry.filePath) as never, {
      status: 200,
      headers: { ...baseHeaders, 'Content-Length': String(size) },
    })
  })
}
