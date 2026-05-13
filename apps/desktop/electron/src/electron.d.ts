import type { ISong, IPlaylist, IAppSettings, IPlaybackState } from '@metatune/common'
import type Electron from 'electron'
export {}

declare global {
  interface Window {
    electronAPI: {
      getAppInfo: () => Promise<any>

      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: () => void
      openFileDialog: (options?: Omit<Electron.OpenDialogOptions, 'properties' | 'filters'>) => Promise<Electron.OpenDialogReturnValue>
      openDirectoryDialog: () => Promise<Electron.OpenDialogReturnValue>
      parseAudioMetadata: (filePaths: string[]) => Promise<ISong[]>
      getAudioStreamUrl: (filePath: string) => Promise<string>
      // getStore: (key?: string) => Promise<any>;
      // setStore: (data: { key: string, data: any }) => Promise<boolean>;

      getLocalListCache: () => Promise<ISong[]>
      setLocalListCache: (data: ISong[]) => Promise<boolean>
      getPlayerCache: () => Promise<{ playlists: IPlaylist; settings: IAppSettings; state: IPlaybackState } | null>
      setPlayerCache: (data: { playlists: IPlaylist; settings: IAppSettings; state: IPlaybackState }) => Promise<boolean>
      setWindowTitle: (title: string) => void

      send: (channel: string, data?: any) => void
      on: (channel: string, func: (...args: any[]) => void) => () => void
    }
  }
}
