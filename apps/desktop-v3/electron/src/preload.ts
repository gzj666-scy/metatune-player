import { contextBridge, ipcRenderer } from 'electron'
import type Electron from 'electron'
import type { ISong, IImportResult, IScanResult, OnProgress } from '@metatune/common-v3/types'
import type { IPlayerData } from './appCache'
import { IPC } from './ipc/channels'

export interface IImportProgress {
  done: number
  total: number
  fileName: string
}

export interface IUpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloaded' | 'error'
  auto: boolean
  version?: string
  releaseNotes?: string
  message?: string
}

export interface IUpdateProgress {
  percent: number
  bytesPerSecond: number
  total: number
}

type Unsubscribe = () => void

/** main -> renderer 事件订阅封装 */
function subscribe<T>(channel: string, callback: (data: T) => void): Unsubscribe {
  const listener = (_event: Electron.IpcRendererEvent, data: T) => callback(data)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// 暴露给渲染层的 API（白名单式，v3 移除了通用 send/on 通道）
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用
  getAppInfo: () => ipcRenderer.invoke(IPC.APP_INFO),
  setWindowTitle: (title: string) => ipcRenderer.invoke(IPC.APP_SET_TITLE, title),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.invoke(IPC.WINDOW_MAXIMIZE),
  closeWindow: (quit: boolean) => ipcRenderer.invoke(IPC.WINDOW_CLOSE, quit),

  // 对话框
  openFileDialog: (options?: Omit<Electron.OpenDialogOptions, 'properties' | 'filters'>) => ipcRenderer.invoke(IPC.DIALOG_OPEN_FILE, options),
  openDirectoryDialog: () => ipcRenderer.invoke(IPC.DIALOG_OPEN_DIRECTORY),

  // 音频：导入 / 增量扫描 / 流地址
  importAudio: (paths: string[], onProgress?: OnProgress): Promise<IImportResult> => {
    const unsubscribe = onProgress ? subscribe<IImportProgress>(IPC.AUDIO_IMPORT_PROGRESS, d => onProgress(d.done, d.total, d.fileName)) : null
    return ipcRenderer.invoke(IPC.AUDIO_IMPORT, paths).finally(() => unsubscribe?.())
  },
  scanAudioDirs: (dirs: string[], knownSongs: ISong[]): Promise<IScanResult> => ipcRenderer.invoke(IPC.AUDIO_SCAN_DIRS, dirs, knownSongs),
  getAudioStreamUrl: (filePath: string): Promise<string> => ipcRenderer.invoke(IPC.AUDIO_STREAM_URL, filePath),

  // 缓存
  getSongsCache: (): Promise<ISong[]> => ipcRenderer.invoke(IPC.CACHE_GET_SONGS),
  setSongsCache: (data: ISong[]): Promise<void> => ipcRenderer.invoke(IPC.CACHE_SET_SONGS, data),
  getPlayerCache: (): Promise<IPlayerData | null> => ipcRenderer.invoke(IPC.CACHE_GET_PLAYER),
  setPlayerCache: (data: IPlayerData): Promise<void> => ipcRenderer.invoke(IPC.CACHE_SET_PLAYER, data),
  resetAllCache: (): Promise<boolean> => ipcRenderer.invoke(IPC.CACHE_RESET_ALL),
  clearInvalidAlbumArt: (albumArts: Set<string | undefined>): Promise<void> => ipcRenderer.invoke(IPC.CACHE_CLEAR_INVALID_ALBUM_ART, albumArts),

  // 更新
  checkUpdate: (auto: boolean) => ipcRenderer.send(IPC.UPDATE_CHECK, { auto }),
  downloadUpdate: () => ipcRenderer.send(IPC.UPDATE_DOWNLOAD),
  installUpdate: () => ipcRenderer.send(IPC.UPDATE_INSTALL),
  onUpdateStatus: (callback: (data: IUpdateStatus) => void) => subscribe(IPC.UPDATE_STATUS, callback),
  onUpdateProgress: (callback: (data: IUpdateProgress) => void) => subscribe(IPC.UPDATE_PROGRESS, callback),

  // 退出前保存（主进程 before-quit 触发）
  onFlushRequest: (callback: () => void | Promise<void>) => {
    const unsubscribe = subscribe(IPC.APP_FLUSH, async () => {
      await callback()
      ipcRenderer.send(IPC.APP_FLUSHED)
    })
    return unsubscribe
  },
})
