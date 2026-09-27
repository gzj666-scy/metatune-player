import type Electron from 'electron'
import type { ISong, IPlaylist, IAppSettings, IPlaybackState, IImportResult, IScanResult, OnProgress } from '@metatune/common-v3/types'
import type { IPlayerData } from './appCache'
import type { IImportProgress, IUpdateStatus, IUpdateProgress } from './preload'

type Unsubscribe = () => void

export {}

declare global {
  interface Window {
    electronAPI: {
      getAppInfo: () => Promise<{ name: string; version: string; platform: string }>
      setWindowTitle: (title: string) => Promise<void>

      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      closeWindow: (quit: boolean) => Promise<void>

      openFileDialog: (options?: Omit<Electron.OpenDialogOptions, 'properties' | 'filters'>) => Promise<Electron.OpenDialogReturnValue>
      openDirectoryDialog: () => Promise<Electron.OpenDialogReturnValue>

      importAudio: (paths: string[], onProgress?: OnProgress) => Promise<IImportResult>
      scanAudioDirs: (dirs: string[], knownSongs: ISong[]) => Promise<IScanResult>
      getAudioStreamUrl: (filePath: string) => Promise<string>

      getSongsCache: () => Promise<ISong[]>
      setSongsCache: (data: ISong[]) => Promise<void>
      getPlayerCache: () => Promise<IPlayerData | null>
      setPlayerCache: (data: { songDirs: string[]; playlists: IPlaylist; settings: IAppSettings; state: IPlaybackState }) => Promise<void>
      resetAllCache: () => Promise<boolean>
      clearInvalidAlbumArt: (albumArts: Set<string | undefined>) => Promise<void>

      checkUpdate: (auto: boolean) => void
      downloadUpdate: () => void
      installUpdate: () => void
      onUpdateStatus: (callback: (data: IUpdateStatus) => void) => Unsubscribe
      onUpdateProgress: (callback: (data: IUpdateProgress) => void) => Unsubscribe

      onFlushRequest: (callback: () => void | Promise<void>) => Unsubscribe
    }
  }
}
