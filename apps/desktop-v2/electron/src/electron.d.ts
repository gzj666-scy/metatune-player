import type { ISong } from '@metatune/common-v2/types'
import type { PlayerCacheData, ScanResult } from './types'
import type Electron from 'electron'
export {}

declare global {
  interface Window {
    electronAPI: {
      getAppInfo: () => Promise<{ name: string; version: string; platform: string }>

      // 窗口控制
      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: (quit: boolean) => void

      // 文件对话框与导入
      openFileDialog: (options?: Omit<Electron.OpenDialogOptions, 'properties' | 'filters'>) => Promise<Electron.OpenDialogReturnValue>
      openDirectoryDialog: () => Promise<Electron.OpenDialogReturnValue>
      /** 扫描并解析音频（增量：mtime/size 未变的文件直接复用缓存） */
      scanAudio: (filePaths: string[]) => Promise<ScanResult>
      /** 为曲库内歌曲签发一次性音频流地址 */
      openAudioStream: (uid: string) => Promise<string>

      // 本地缓存
      getLocalListCache: () => Promise<ISong[]>
      setLocalListCache: (data: ISong[]) => Promise<boolean>
      getPlayerCache: () => Promise<PlayerCacheData | null>
      setPlayerCache: (data: PlayerCacheData) => Promise<boolean>
      resetAllCache: () => Promise<boolean>
      setWindowTitle: (title: string) => void
      /** 清理已不再被引用的封面图（传文件名，不含 cache:// 前缀） */
      clearInvalidAlbumArt: (albumArts: string[]) => Promise<boolean>

      send: (channel: string, data?: any) => void
      on: (channel: string, func: (...args: any[]) => void) => () => void
    }
  }
}
