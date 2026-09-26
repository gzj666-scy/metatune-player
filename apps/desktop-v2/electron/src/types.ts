import type { IAppSettings, IPlaybackState, IPlaylist, ISong } from '@metatune/common-v2/types'

/** 主进程与渲染进程共享的纯类型（不含运行时依赖，可被 preload / 渲染层安全引用） */

export interface ScanFailure {
  filePath: string
  reason: string
}

export interface ScanResult {
  songs: ISong[]
  failures: ScanFailure[]
  /** 本次真正解析的文件数 */
  parsed: number
  /** 命中缓存、未重新解析的文件数 */
  skipped: number
}

/** player-data.json 的完整结构 */
export interface PlayerCacheData {
  songDirs: string[]
  playlists: IPlaylist
  settings: IAppSettings
  state: IPlaybackState
}
