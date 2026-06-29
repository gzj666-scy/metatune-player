import { IAppSettings, IPlaybackState, IPlaylist, ISong } from '@metatune/common/types'
import { app } from 'electron'
import { accessSync, constants, existsSync, mkdirSync, rmSync } from 'fs'
import { access, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
// C:\Users\scy\AppData\Roaming\metatune-data.json
// const storePath = join(app.getPath('appData'), 'metatune-data.json')
// console.log('持久化存储数据地址 ', storePath)
// let store = {
//     // 本地列表
//     local: { sortType: '', sortDirc: '', list: [] },
//     // 最近播放
//     recent: { list: [] },
//     // 我收藏的
//     favorite: { list: [] },
//     // 我的歌单
//     playlist: { sortType: '', sortDirc: '', list: [] },
// }

// export const initStore = () => {
//     try {
//         store = JSON.parse(readFileSync(storePath, 'utf8'))
//     } catch (error) {
//         console.warn('初始存储数据失败 ', error)
//     }
// }

// /**
//  * 根据多级 key 修改 store 对应字段的值
//  * @param key 格式: 'local:sortType' 或 'playlist:list:0:title'
//  * @param data 要设置的值
//  * @param autoCreate 是否自动创建中间层级（默认 true）
//  */
// export const saveStore = <T = any>(key: string, data: T, autoCreate = true): boolean => {
//     if (!key) return false

//     const keys = key.split(':').filter(v => v)
//     if (keys.length === 0) return false

//     let current: any = store
//     const lastIdx = keys.length - 1
//     let mark = false

//     for (let i = 0; i < keys.length; i++) {
//         const k = keys[i]

//         // 最后一层：执行赋值
//         if (i === lastIdx) {
//             // 支持数组索引（如 'list:0'）
//             const index = Number(k)
//             if (!isNaN(index) && Array.isArray(current)) {
//                 current[index] = data
//             } else {
//                 current[k] = data
//             }
//             mark = true
//             break
//         }

//         // 中间层级：导航或自动创建
//         const next = current[k]
//         if (next === undefined || next === null) {
//             if (autoCreate) {
//                 // 智能判断下一层是数组还是对象
//                 const nextKey = keys[i + 1]
//                 const isNextArray = !isNaN(Number(nextKey))
//                 current[k] = isNextArray ? [] : {}
//                 current = current[k]
//             } else {
//                 console.warn(`[saveLocal] Path not found: ${key}`)
//                 mark = false
//                 break
//             }
//         } else {
//             current = next
//         }
//     }

//     if (mark) {
//         writeFileSync(storePath, JSON.stringify(store))
//     }

//     return mark
// }

// /**
//  * 根据多级 key 读取 store 对应字段的值
//  * @param key 格式: 'local:sortType'
//  * @param defaultValue 路径不存在时的默认返回值
//  */
// export const getStore = <T = any>(key: string, defaultValue?: T): T | undefined => {
//     let current: any = store
//     console.log("加载持久化数据", key, store);
//     if (!key) return current

//     const keys = key.split(':').filter(v => v)

//     for (const k of keys) {
//         if (current === undefined || current === null) return defaultValue
//         const index = Number(k)
//         current = !isNaN(index) && Array.isArray(current) ? current[index] : current[k]
//     }

//     return current !== undefined ? current : defaultValue
// }

// /**
//  * 批量设置多个 key-value（原子操作，失败回滚）
//  */
// export const saveLocalBatch = (pairs: Array<{ key: string; value: any }>): boolean => {
//     const backup = JSON.parse(JSON.stringify(store)) // 简单深拷贝备份
//     try {
//         for (const { key, value } of pairs) {
//             if (!saveStore(key, value)) {
//                 throw new Error(`Invalid key: ${key}`)
//             }
//         }
//         return true
//     } catch (e) {
//         // 失败则回滚
//         Object.assign(store, backup)
//         console.error('[saveLocalBatch] Rollback due to error:', e)
//         return false
//     }
// }

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const isDev = process.env.NODE_ENV === 'development'

const resolveCacheDir = (): string => {
  if (isDev) {
    const exeDir = app.isPackaged ? dirname(app.getPath('exe')) : join(__dirname, '../../')
    return join(exeDir, '.metatune-cache')
  } else {
    // C:\Users\scy\AppData\Roaming\Metatune Player\.cache
    return join(app.getPath('appData'), 'Metatune Player', '.cache')
  }
  // 1. 尝试放在可执行文件同级目录（避开 C 盘，适合便携版/自定义安装）
  const exeDir = app.isPackaged ? dirname(app.getPath('exe')) : join(__dirname, '../../')
  const targetDir = join(exeDir, '.metatune-cache')
  // 2. 检查是否可写，不可写则降级到 userData
  try {
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })
    accessSync(targetDir, constants.W_OK)
    return targetDir
  } catch {
    // 降级到系统用户目录（保证功能可用）
    return join(app.getPath('appData'), 'Metatune Player', '.cache')
  }
}
export const CACHE_DIR = resolveCacheDir()
// 存放本地列表歌曲元数据
const META_FILE = join(CACHE_DIR, 'metatune-data.json')
// 存放播放器功能(歌单、设置等)数据
const PLAY_FILE = join(CACHE_DIR, 'player-data.json')
// 存放封面图缓存
export const COVER_DIR = join(CACHE_DIR, 'covers')
console.log('缓存目录 2 ', META_FILE, PLAY_FILE, COVER_DIR)
const ensureDir = async () => {
  await Promise.all([mkdir(CACHE_DIR, { recursive: true }), mkdir(COVER_DIR, { recursive: true })])
}

export const getCacheDir = () => {
  return { meta: META_FILE, play: PLAY_FILE, cover: COVER_DIR }
}

export const resetAllCache = () => {
  rmSync(CACHE_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  return true
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
    await writeFile(META_FILE, JSON.stringify(songs), 'utf8')
  }

  async clear(): Promise<void> {
    await rm(META_FILE, { force: true })
  }
}

export class PlayerCache {
  async get(): Promise<{ playlists: IPlaylist; settings: IAppSettings } | null> {
    await ensureDir()
    try {
      const data = await readFile(PLAY_FILE, 'utf8')
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  async set(data: { songDirs: string[]; playlists: IPlaylist; settings: IAppSettings; state: IPlaybackState }): Promise<void> {
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

  async clear(): Promise<void> {
    await rm(COVER_DIR, { recursive: true, force: true })
  }
}

export const cache = { meta: new MetadataCache(), player: new PlayerCache(), cover: new CoverCache() }
