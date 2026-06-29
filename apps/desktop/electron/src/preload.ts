import type { IAppSettings, IPlaylist, ISong, IPlaybackState } from '@metatune/common'
import { contextBridge, ipcRenderer } from 'electron'
import type Electron from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  // importFile: () => ipcRenderer.invoke('dialog:openFile'),

  // ipcRenderer.invoke 要用 ipcMain.handle 监听
  // ipcRenderer.send 要用 ipcMain.on 监听
  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: (quit: boolean) => ipcRenderer.invoke('window:close', quit),

  // 文件对话框
  /** 导入文件 */
  openFileDialog: (options?: Omit<Electron.OpenDialogOptions, 'properties' | 'filters'>) => ipcRenderer.invoke('dialog:openFile', options),
  /** 导入文件夹 */
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  /** 音频元数据解析 */
  parseAudioMetadata: (filePaths: string[]) => ipcRenderer.invoke('audio:parseMetadata', filePaths),
  /** 获取音频文件流地址 */
  getAudioStreamUrl: (filePath: string) => ipcRenderer.invoke('audio:streamUrl', filePath),
  /** 获取本地存储数据 */
  getStore: (key?: string) => ipcRenderer.invoke('storage:get', key),
  /** 设置本地存储数据 */
  setStore: (data: { key: string; data: any }) => ipcRenderer.invoke('storage:set', data),

  /** 获取本地歌曲数据 */
  getLocalListCache: () => ipcRenderer.invoke('cache:get:localList'),
  /** 设置本地歌曲数据 */
  setLocalListCache: (data: ISong[]) => ipcRenderer.invoke('cache:set:localList', data),
  /** 获取播放器数据 */
  getPlayerCache: () => ipcRenderer.invoke('cache:get:player'),
  /** 设置播放器数据 */
  setPlayerCache: (data: { songDirs: string[]; playlists: IPlaylist; settings: IAppSettings; state: IPlaybackState }) =>
    ipcRenderer.invoke('cache:set:player', data),
  /** 重置所有缓存数据 */
  resetAllCache: () => ipcRenderer.invoke('cache:reset:all'),
  /** 修改标题 */
  setWindowTitle: (title: string) => ipcRenderer.invoke('set-window-title', title),
  // 歌词处理
  // readLyricFile: (lyricPath) => ipcRenderer.invoke('lyric:readFile', lyricPath),

  // 文件操作
  // saveBackupFile: (content) => ipcRenderer.invoke('file:saveBackup', content),
  // loadBackupFile: () => ipcRenderer.invoke('file:loadBackup'),

  // 渲染进程到主进程的通信
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  on: (channel: string, func: (...args: any[]) => void) => {
    const subscription = (event: any, ...args: any[]) => func(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  },
})
