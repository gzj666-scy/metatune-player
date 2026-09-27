import { IAppSettings, IPlaybackState, IPlaylist, ISong } from '@metatune/common-v3/types'
import { app } from 'electron'
import { mkdirSync, rmSync } from 'fs'
import { access, mkdir, readdir, readFile, rename, rm, stat, unlink, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const isDev = process.env.NODE_ENV === 'development'

function resolveCacheDir(): string {
  if (isDev) {
    const exeDir = app.isPackaged ? dirname(app.getPath('exe')) : join(__dirname, '../../')
    return join(exeDir, '.metatune-cache')
  }
  // 便携版优先放 exe 同级（避开 C 盘），不可写时降级到用户目录
  if (app.isPackaged) {
    const targetDir = join(dirname(app.getPath('exe')), '.metatune-cache')
    try {
      mkdirSync(targetDir, { recursive: true })
      return targetDir
    } catch {
      /* fallthrough */
    }
  }
  // C:\Users\scy\AppData\Roaming\Metatune Player\.cache
  return join(app.getPath('appData'), 'Metatune Player', '.cache')
}

// 数据目录归属与卸载行为说明：
//  - 开发环境：项目根 .metatune-cache/
//  - 便携版：exe 同级 .metatune-cache/（删除程序目录即全部清除）
//  - 安装版：%APPDATA%\Metatune Player\.cache（位于 Electron userData 下）
//    NSIS 配置 deleteAppDataOnUninstall: false → 卸载不删除，重装后歌单/设置/封面保留；
//    应用内"设置 → 重置数据"可随时清空（resetAllCache）。
//  另：electron-updater 下载缓存在 %LOCALAPPDATA%\metatune-player-updater，独立于上述目录。
export const CACHE_DIR = resolveCacheDir()
// 存放本地列表歌曲元数据
const META_FILE = join(CACHE_DIR, 'metatune-data.json')
// 存放播放器功能(歌单、设置等)数据
const PLAY_FILE = join(CACHE_DIR, 'player-data.json')
// 存放封面图缓存
export const COVER_DIR = join(CACHE_DIR, 'covers')

/** 播放器持久化数据（读写结构对称，原版 get/set 类型不一致已修正） */
export interface IPlayerData {
  songDirs: string[]
  playlists: IPlaylist
  settings: IAppSettings
  state: IPlaybackState
}

async function ensureDir() {
  await Promise.all([mkdir(CACHE_DIR, { recursive: true }), mkdir(COVER_DIR, { recursive: true })])
}

export function getCacheDir() {
  return { meta: META_FILE, play: PLAY_FILE, cover: COVER_DIR }
}

export function resetAllCache() {
  rmSync(CACHE_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  return true
}

/**
 * 原子写盘：先写临时文件再 rename，避免写一半崩溃导致 JSON 损坏
 */
async function atomicWriteFile(filePath: string, content: string) {
  const tmpFile = filePath + '.tmp'
  await writeFile(tmpFile, content, 'utf8')
  await rename(tmpFile, filePath)
}

export class MetadataCache {
  async get(): Promise<ISong[]> {
    await ensureDir()
    try {
      const data = await readFile(META_FILE, 'utf8')
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  async set(songs: ISong[]): Promise<void> {
    await ensureDir()
    await atomicWriteFile(META_FILE, JSON.stringify(songs))
  }

  async clear(): Promise<void> {
    await rm(META_FILE, { force: true })
  }
}

export class PlayerCache {
  async get(): Promise<IPlayerData | null> {
    await ensureDir()
    try {
      const data = await readFile(PLAY_FILE, 'utf8')
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  async set(data: IPlayerData): Promise<void> {
    await ensureDir()
    await atomicWriteFile(PLAY_FILE, JSON.stringify(data))
  }

  async clear(): Promise<void> {
    await rm(PLAY_FILE, { force: true })
  }
}

export class CoverCache {
  async save(fileName: string, data: Uint8Array | ArrayBuffer): Promise<string> {
    await ensureDir()
    const filePath = join(COVER_DIR, fileName)
    const buffer = data instanceof Uint8Array ? data : new Uint8Array(data)
    await writeFile(filePath, buffer)
    return `cache://${fileName}`
  }

  async get(fileName: string): Promise<string> {
    const filePath = join(COVER_DIR, fileName)
    try {
      await access(filePath)
      return `cache://${fileName}`
    } catch {
      return ''
    }
  }

  async clear(albumArts: Set<string | undefined>): Promise<void> {
    const files = await readdir(COVER_DIR)
    const deletePromises: Promise<void>[] = []
    for (const file of files) {
      const filePath = join(COVER_DIR, file)
      const stats = await stat(filePath)
      if (stats.isFile() && !albumArts.has(file)) {
        deletePromises.push(unlink(filePath))
      }
    }
    await Promise.all(deletePromises)
  }

  async clearAll(): Promise<void> {
    await rm(COVER_DIR, { recursive: true, force: true })
  }
}

export const cache = { meta: new MetadataCache(), player: new PlayerCache(), cover: new CoverCache() }
