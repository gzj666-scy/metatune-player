import type { ISong } from '@metatune/common-v2/types'
import type { PlayerCacheData } from './types'
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
  /** 扫描并解析音频（增量：未变更的文件直接复用缓存） */
  scanAudio: (filePaths: string[]) => ipcRenderer.invoke('audio:scan', filePaths),
  /** 获取音频流地址（一次性 token，仅曲库内文件可签发） */
  openAudioStream: (uid: string) => ipcRenderer.invoke('audio:openStream', uid),

  /** 获取本地歌曲数据 */
  getLocalListCache: () => ipcRenderer.invoke('cache:get:localList'),
  /** 设置本地歌曲数据 */
  setLocalListCache: (data: ISong[]) => ipcRenderer.invoke('cache:set:localList', data),
  /** 获取播放器数据 */
  getPlayerCache: () => ipcRenderer.invoke('cache:get:player'),
  /** 设置播放器数据 */
  setPlayerCache: (data: PlayerCacheData) => ipcRenderer.invoke('cache:set:player', data),
  /** 重置所有缓存数据 */
  resetAllCache: () => ipcRenderer.invoke('cache:reset:all'),
  /** 修改标题 */
  setWindowTitle: (title: string) => ipcRenderer.invoke('set-window-title', title),
  /** 清理无效专辑图 */
  clearInvalidAlbumArt: (albumArts: string[]) => ipcRenderer.invoke('cache:clear:invalidAlbumArt', albumArts),
  // 歌词处理
  // readLyricFile: (lyricPath) => ipcRenderer.invoke('lyric:readFile', lyricPath),

  // 文件操作
  // saveBackupFile: (content) => ipcRenderer.invoke('file:saveBackup', content),
  // loadBackupFile: () => ipcRenderer.invoke('file:loadBackup'),

  // 渲染进程到主进程的通信
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  on: (channel: string, func: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => func(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  },
})
