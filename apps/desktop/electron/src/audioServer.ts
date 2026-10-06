import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { createReadStream, statSync } from 'fs'
import { randomUUID } from 'crypto'
import { extname, isAbsolute } from 'path'
import { SupportedAudioFormat } from '@metatune/common/utils'
import { getMimeType } from './utils'

/**
 * 音频流服务：本地 HTTP 服务 + Range 支持，供渲染层 <audio> 播放。
 * 安全策略（v3）：
 *  - 启动时生成随机 token，所有请求必须携带 ?t=<token>，防止本机其他进程/网页枚举读取
 *  - 扩展名白名单校验，仅允许音频格式
 *  - 仅监听 127.0.0.1
 */
export class AudioStreamServer {
  private server: ReturnType<typeof createServer> | null = null
  private port = 1688
  private token = randomUUID().replace(/-/g, '')

  get baseUrl(): string {
    return `http://127.0.0.1:${this.port}`
  }

  /** 生成带鉴权 token 的流地址 */
  getStreamUrl(filePath: string): string {
    return `${this.baseUrl}/stream?t=${this.token}&p=${encodeURIComponent(filePath)}`
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tryListen = (port: number): void => {
        const server = createServer((req, res) => this.handle(req, res))
        server.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            // 端口被占则递增重试，成功后同步实际端口到 baseUrl
            tryListen(port + 1)
          } else {
            reject(err)
          }
        })
        server.listen(port, '127.0.0.1', () => {
          this.port = port
          this.server = server
          console.log('音频流服务已启动:', this.baseUrl)
          resolve()
        })
      }
      tryListen(this.port)
    })
  }

  stop(): void {
    this.server?.close()
    this.server = null
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    try {
      // Private Network Access（PNA）预检：渲染进程以 http(s):// 源跨到 127.0.0.1 时，
      // Chromium 会先发 OPTIONS 带 Access-Control-Request-Private-Network。
      // Web Audio 模式（html5:false）下 Howler 用 XHR 加载流，XHR 受 PNA 约束；
      // 而 <audio> 媒体加载豁免 PNA。必须应答预检，否则 XHR 永久挂起（既不 load 也不 error）。
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Private-Network': 'true',
        })
        res.end()
        return
      }

      const url = new URL(req.url || '/', this.baseUrl)
      if (url.pathname !== '/stream') {
        res.writeHead(404).end()
        return
      }
      if (url.searchParams.get('t') !== this.token) {
        res.writeHead(403).end('Forbidden')
        return
      }
      const filePath = decodeURIComponent(url.searchParams.get('p') || '')
      if (!isAbsolute(filePath) || !SupportedAudioFormat.includes(extname(filePath).slice(1).toLowerCase())) {
        res.writeHead(400).end('Bad Request')
        return
      }

      const stats = statSync(filePath)
      if (!stats.isFile()) {
        res.writeHead(403).end('Forbidden')
        return
      }

      const headers: Record<string, string | number> = {
        'Content-Type': getMimeType(filePath),
        'Accept-Ranges': 'bytes',
        // 已有 token 鉴权，此处放开 CORS 以便 <audio crossorigin> 取流用于可视化分析
        'Access-Control-Allow-Origin': '*',
        // PNA 实际请求也必须带此头，Chromium 才放行跨到私有地址的 XHR
        'Access-Control-Allow-Private-Network': 'true',
      }

      const { range } = req.headers
      if (range) {
        const match = /bytes=(\d*)-(\d*)/.exec(range)
        let start = match?.[1] ? parseInt(match[1], 10) : 0
        let end = match?.[2] ? parseInt(match[2], 10) : stats.size - 1
        start = Math.max(0, Math.min(start, stats.size - 1))
        end = Math.max(start, Math.min(end, stats.size - 1))
        res.writeHead(206, {
          ...headers,
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Content-Length': end - start + 1,
        })
        createReadStream(filePath, { start, end }).pipe(res)
      } else {
        res.writeHead(200, { ...headers, 'Content-Length': stats.size })
        createReadStream(filePath).pipe(res)
      }
    } catch (error) {
      console.error('音频流出错:', error)
      if (!res.headersSent) res.writeHead(500).end('Internal Server Error')
      else res.end()
    }
  }
}
