import type { ISong } from '@metatune/common-v2/types'
import { app } from 'electron'
import { rmSync } from 'fs'
import { access, mkdir, readFile, readdir, rm, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import type { PlayerCacheData } from './types'

// 与 main.ts 同理：CJS 产物里只有原生 __dirname 可用
declare const __dirname: string
const isDev = process.env.NODE_ENV === 'development'

/**
 * 缓存目录：开发期放在项目内便于查看，打包后放用户数据目录（安装目录通常只读）。
 * 刻意与 v1 分开，避免两个版本互相覆盖曲库数据。
 */
const resolveCacheDir = (): string => {
  if (isDev) return join(__dirname, '../', '.metatune-cache')
  return join(app.getPath('appData'), 'Metatune Player V2', '.cache')
}

export const CACHE_DIR = resolveCacheDir()
/** 本地列表歌曲元数据 */
const META_FILE = join(CACHE_DIR, 'metatune-data.json')
/** 播放器数据（歌单、设置、播放状态） */
const PLAY_FILE = join(CACHE_DIR, 'player-data.json')
/** 封面图缓存 */
export const COVER_DIR = join(CACHE_DIR, 'covers')

const ensureDir = async () => {
  await Promise.all([mkdir(CACHE_DIR, { recursive: true }), mkdir(COVER_DIR, { recursive: true })])
}

/**
 * 封面图对外 URL。文件名放在 path 段而不是 host，
 * 因为 cache 注册为 standard scheme，`cache://<文件名>` 会把文件名解析成 host。
 */
export const coverUrl = (fileName: string) => `cache://cover/${encodeURIComponent(fileName)}`

export const resetAllCache = () => {
  rmSync(CACHE_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  return true
}

export class MetadataCache {
  /** filePath -> song。增量扫描靠它判断哪些文件没变过，避免全量重解析 */
  private index = new Map<string, ISong>()
  private loaded = false

  private async load(): Promise<Map<string, ISong>> {
    if (this.loaded) return this.index
    this.loaded = true
    await ensureDir()
    try {
      const songs: ISong[] = JSON.parse(await readFile(META_FILE, 'utf8'))
      this.index = new Map(songs.map(song => [song.filePath, song]))
    } catch {
      this.index = new Map()
    }
    return this.index
  }

  async get(): Promise<ISong[]> {
    return [...(await this.load()).values()]
  }

  async getIndex(): Promise<Map<string, ISong>> {
    return this.load()
  }

  async set(songs: ISong[]): Promise<void> {
    await ensureDir()
    this.loaded = true
    this.index = new Map(songs.map(song => [song.filePath, song]))
    await writeFile(META_FILE, JSON.stringify(songs), 'utf8')
  }

  async clear(): Promise<void> {
    this.index = new Map()
    this.loaded = true
    await rm(META_FILE, { force: true })
  }
}

export class PlayerCache {
  async get(): Promise<PlayerCacheData | null> {
    await ensureDir()
    try {
      return JSON.parse(await readFile(PLAY_FILE, 'utf8'))
    } catch {
      return null
    }
  }

  async set(data: PlayerCacheData): Promise<void> {
    await ensureDir()
    await writeFile(PLAY_FILE, JSON.stringify(data), 'utf8')
  }

  async clear(): Promise<void> {
    await rm(PLAY_FILE, { force: true })
  }
}

export class CoverCache {
  async save(fileName: string, data: Uint8Array | ArrayBuffer): Promise<string> {
    await ensureDir()
    const buffer = data instanceof Uint8Array ? data : new Uint8Array(data)
    await writeFile(join(COVER_DIR, fileName), buffer)
    return coverUrl(fileName)
  }

  async get(fileName: string): Promise<string> {
    try {
      await access(join(COVER_DIR, fileName))
      return coverUrl(fileName)
    } catch {
      return ''
    }
  }

  /** 清掉本次曲库里不再引用的封面，避免缓存无限膨胀 */
  async clear(albumArts: Set<string>): Promise<void> {
    const files = await readdir(COVER_DIR)
    await Promise.all(files.filter(file => !albumArts.has(file)).map(file => unlink(join(COVER_DIR, file)).catch(() => {})))
  }

  async clearAll(): Promise<void> {
    await rm(COVER_DIR, { recursive: true, force: true })
  }
}

export const cache = { meta: new MetadataCache(), player: new PlayerCache(), cover: new CoverCache() }
