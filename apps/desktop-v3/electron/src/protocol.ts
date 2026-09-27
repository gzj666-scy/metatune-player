import { protocol } from 'electron'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { join, resolve, sep } from 'path'
import { COVER_DIR } from './appCache'
import { getMimeType } from './utils'

/**
 * 注册 cache:// 自定义协议（封面图）。
 * 安全策略（v3）：resolve 后校验路径仍在 COVER_DIR 内，阻断 ../ 路径穿越。
 */
export function registerCacheProtocol(): void {
  // 必须在 app.whenReady() 之前注册 scheme
  protocol.registerSchemesAsPrivileged([{ scheme: 'cache', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false } }])
}

export async function handleCacheProtocol(): Promise<void> {
  protocol.handle('cache', async request => {
    try {
      const url = decodeURIComponent(request.url.slice('cache://'.length))
      const filePath = resolve(join(COVER_DIR, url))
      // 防路径穿越：解析后必须仍在封面目录内
      if (!filePath.startsWith(COVER_DIR + sep)) {
        return new Response('Forbidden', { status: 403 })
      }
      const stats = await stat(filePath)
      if (!stats.isFile()) return new Response('Not Found', { status: 404 })
      const stream = createReadStream(filePath)
      return new Response(stream, {
        headers: {
          'Content-Type': getMimeType(filePath),
          'Content-Length': stats.size.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  })
}
