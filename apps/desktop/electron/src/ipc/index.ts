import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC } from './channels'
import { cache, resetAllCache, CACHE_DIR, type IPlayerData } from '../appCache'
import { AudioFormat, parsePaths } from '../parseMetadata'
import { scanDirs } from '../audioScanner'
import type { AudioStreamServer } from '../audioServer'
import type { IKnownSong, ISong } from '@metatune/common/types'
import { checkForUpdates, downloadUpdate, installUpdate } from '../updater'
import { closeWindow, getWindow } from '../window'
import { setTrayToolTip } from '../tray'

function registerAppHandlers() {
  ipcMain.handle(IPC.APP_INFO, () => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    isPortable: !!process.env.PORTABLE_EXECUTABLE_DIR,
  }))

  ipcMain.handle(IPC.APP_SET_TITLE, (_, title: string) => {
    const win = getWindow()
    win?.setTitle(title)
    setTrayToolTip(title)
  })
}

function registerWindowHandlers() {
  ipcMain.handle(IPC.WINDOW_MINIMIZE, () => getWindow()?.minimize())
  ipcMain.handle(IPC.WINDOW_MAXIMIZE, () => {
    const win = getWindow()
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle(IPC.WINDOW_CLOSE, (_, quit: boolean) => closeWindow(quit))
}

function registerDialogHandlers() {
  ipcMain.handle(IPC.DIALOG_OPEN_FILE, async (_, options: Record<string, unknown> = {}) => {
    return dialog.showOpenDialog(getWindow() as BrowserWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '音频文件', extensions: AudioFormat }],
      ...options,
    })
  })
  ipcMain.handle(IPC.DIALOG_OPEN_DIRECTORY, async () => {
    return dialog.showOpenDialog(getWindow() as BrowserWindow, { properties: ['openDirectory'] })
  })
}

function registerAudioHandlers(audioServer: AudioStreamServer) {
  /**
   * 批量导入：paths 可为文件或目录，主进程负责递归展开、并发解析、上报进度
   */
  ipcMain.handle(IPC.AUDIO_IMPORT, async (_, paths: string[]) => {
    const win = getWindow()
    let lastSent = 0
    const onProgress = (done: number, total: number, fileName: string) => {
      // 每 80ms 或完成时上报一次，避免高频刷 IPC
      const now = Date.now()
      if (win && (now - lastSent > 80 || done >= total)) {
        lastSent = now
        win.webContents.send(IPC.AUDIO_IMPORT_PROGRESS, { done, total, fileName })
      }
    }
    return parsePaths(paths || [], onProgress)
  })

  /** 增量扫描：返回需要新增/更新/移除的文件清单 */
  ipcMain.handle(IPC.AUDIO_SCAN_DIRS, async (_, dirs: string[], knownSongs: ISong[]) => {
    const known: IKnownSong[] = (knownSongs || []).map(v => ({ filePath: v.filePath, size: v.size, mtime: v.mtime, isValid: v.isValid }))
    return scanDirs(dirs || [], known)
  })

  ipcMain.handle(IPC.AUDIO_STREAM_URL, (_, filePath: string) => {
    try {
      return audioServer.getStreamUrl(filePath)
    } catch (error) {
      console.error('生成流地址失败:', error)
      return null
    }
  })

  /** 读取音频文件原始字节（响度测量：渲染进程解码后得到 PCM） */
  ipcMain.handle(IPC.AUDIO_READ_BUFFER, async (_, filePath: string) => {
    try {
      const fs = await import('node:fs/promises')
      return await fs.readFile(filePath)
    } catch (error) {
      console.error('读取音频字节失败:', filePath, error)
      return null
    }
  })
}

function registerCacheHandlers() {
  ipcMain.handle(IPC.CACHE_GET_SONGS, () => cache.meta.get())
  ipcMain.handle(IPC.CACHE_SET_SONGS, (_, data: ISong[]) => cache.meta.set(data))
  ipcMain.handle(IPC.CACHE_GET_PLAYER, () => cache.player.get())
  ipcMain.handle(IPC.CACHE_SET_PLAYER, (_, data: IPlayerData) => cache.player.set(data))
  ipcMain.handle(IPC.CACHE_RESET_ALL, () => resetAllCache())
  ipcMain.handle(IPC.CACHE_CLEAR_INVALID_ALBUM_ART, (_, albumArts: Set<string | undefined>) => cache.cover.clear(albumArts))
  ipcMain.handle(IPC.CACHE_GET_PATH, () => CACHE_DIR)
}

function registerUpdateHandlers() {
  ipcMain.on(IPC.UPDATE_CHECK, (_, data: { auto?: boolean }) => checkForUpdates(!!data?.auto))
  ipcMain.on(IPC.UPDATE_DOWNLOAD, () => downloadUpdate())
  ipcMain.on(IPC.UPDATE_INSTALL, () => installUpdate())
}

/** 所有 IPC handler 注册入口（按域分组） */
export function registerIpcHandlers(audioServer: AudioStreamServer): void {
  registerAppHandlers()
  registerWindowHandlers()
  registerDialogHandlers()
  registerAudioHandlers(audioServer)
  registerCacheHandlers()
  registerUpdateHandlers()
}
