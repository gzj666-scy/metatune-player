import { app, BrowserWindow, ipcMain, shell, dialog, protocol, Tray, nativeImage, Menu } from 'electron'
import { join } from 'path'
import { AudioFormat, scanPaths } from './scanner'
import { cache, COVER_DIR, resetAllCache } from './appCache'
import type { ISong } from '@metatune/common-v2/types'
import type { PlayerCacheData } from './types'
import { getMimeType } from './utils'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { autoUpdater } from 'electron-updater'
import { issueMediaToken, registerMediaProtocol } from './mediaProtocol'

// 主进程产物是 CJS，直接用 Node 原生的 __dirname。
// 不要写成 fileURLToPath(new URL('.', import.meta.url))：CJS 里没有 import.meta，
// rolldown 会把它编成字符串 "undefined"，new URL('.', 'undefined') 直接抛 ERR_INVALID_URL。
declare const __dirname: string

process.env.APP_ROOT = join(__dirname, '..')

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let currentTitle = '元音播放器'
let isAutoCheckUpdate = false

/** uid -> filePath。音频流只放行曲库内的文件，token 不对外暴露路径 */
let songPathsByUid = new Map<string, string>()

async function refreshSongIndex() {
  const index = await cache.meta.getIndex()
  songPathsByUid = new Map()
  for (const song of index.values()) songPathsByUid.set(song.uid, song.filePath)
}

/*********************** 检查更新 ***********************/
app.setAppUserModelId('com.gzj666-scy.metatune-v2')
if (!app.isPackaged) {
  Object.defineProperty(app, 'isPackaged', { value: true })
  autoUpdater.updateConfigPath = join(__dirname, '../', 'dev-app-update.yml')
}
function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  const emit = (status: string, extra: Record<string, unknown> = {}) => {
    mainWindow?.webContents.send('update-status', { status, auto: isAutoCheckUpdate, ...extra })
  }

  autoUpdater.on('checking-for-update', () => emit('checking'))
  autoUpdater.on('update-available', info => emit('available', { version: info.version, releaseNotes: info.releaseNotes }))
  autoUpdater.on('update-not-available', () => emit('not-available'))
  autoUpdater.on('update-downloaded', info => emit('downloaded', { version: info.version }))
  autoUpdater.on('error', err => emit('error', { message: err.message }))
  autoUpdater.on('download-progress', progress => {
    mainWindow?.webContents.send('update-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
    })
  })
}

/*********************** 注册自定义协议 ***********************/
// 必须在 app.whenReady() 之前注册
protocol.registerSchemesAsPrivileged([
  { scheme: 'cache', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false } },
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
])

/*********************** 创建托盘 ***********************/
function createTray() {
  const iconPath = isDev ? join(__dirname, '../resources/icons', 'icon.ico') : join(process.resourcesPath, 'icons', 'icon.ico')
  const trayIcon = nativeImage.createFromPath(iconPath)
  if (process.platform === 'darwin') trayIcon.setTemplateImage(true)

  tray = new Tray(trayIcon)
  tray.setToolTip(currentTitle)

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          mainWindow?.show()
          mainWindow?.focus()
          if (process.platform === 'darwin') app.dock?.show()
        },
      },
      { label: '退出', click: () => app.quit() },
    ])
  )

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
}

/*********************** 创建窗口 ***********************/
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: isDev ? 1600 : 1100,
    height: 700,
    title: currentTitle,
    minWidth: 1000,
    minHeight: 640,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: false,
    },
    frame: isDev,
    titleBarStyle: 'hiddenInset',
    show: false,
    skipTaskbar: false,
  })

  setupAutoUpdater()

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('show', () => {
    if (process.platform === 'darwin') app.dock?.show()
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 阻止网页自行修改标题
  mainWindow.webContents.on('page-title-updated', event => event.preventDefault())
  mainWindow.webContents.on('did-finish-load', () => mainWindow?.setTitle(currentTitle))

  if (isDev) {
    await mainWindow.loadURL('http://localhost:3100')
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(join(__dirname, '../dist-web/index.html'))
  }
}

app.whenReady().then(async () => {
  // 封面图走 cache:// 协议，只允许取缓存目录内的文件
  protocol.handle('cache', async request => {
    const fileName = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ''))
    const filePath = join(COVER_DIR, fileName)
    // 文件名由 path 段给出，仍需挡住 ../ 之类的越权构造
    if (!filePath.startsWith(COVER_DIR)) return new Response('Forbidden', { status: 403 })
    const stats = await stat(filePath).catch(() => null)
    if (!stats?.isFile()) return new Response('Forbidden', { status: 403 })

    return new Response(createReadStream(filePath) as never, {
      headers: {
        'Content-Type': getMimeType(filePath),
        'Content-Length': String(stats.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  })

  registerMediaProtocol()
  await refreshSongIndex()

  await createWindow()
  createTray()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

/*********************** IPC ***********************/
ipcMain.handle('get-app-info', () => ({ name: app.getName(), version: app.getVersion(), platform: process.platform }))

ipcMain.handle('window:minimize', () => mainWindow?.minimize())

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})

ipcMain.handle('window:close', (_, quit: boolean) => {
  if (quit) {
    app.quit()
    return
  }
  mainWindow?.hide()
  if (process.platform === 'darwin') app.dock?.hide()
})

ipcMain.handle('dialog:openFile', async () => {
  return dialog.showOpenDialog(mainWindow as BrowserWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '音频文件', extensions: AudioFormat }],
  })
})

ipcMain.handle('dialog:openDirectory', async () => {
  return dialog.showOpenDialog(mainWindow as BrowserWindow, { properties: ['openDirectory'] })
})

/**
 * 扫描并解析音频。带上已有歌曲索引，mtime/size 未变的文件直接复用缓存，
 * 只解析新增文件与内容确实变过的文件。
 */
ipcMain.handle('audio:scan', async (_, paths: string[]) => {
  return scanPaths(paths, { cache: await cache.meta.getIndex() })
})

/** 为曲库内的文件签发音频流 token；曲库外的 uid 一律拒绝 */
ipcMain.handle('audio:openStream', (_, uid: string) => {
  const filePath = songPathsByUid.get(uid)
  if (!filePath) return ''
  return issueMediaToken(filePath)
})

ipcMain.handle('cache:get:localList', () => cache.meta.get())

ipcMain.handle('cache:set:localList', async (_, data: ISong[]) => {
  // 先落盘并更新内存索引，再重建 uid -> 路径 映射，否则会用到上一份索引
  await cache.meta.set(data)
  await refreshSongIndex()
  return true
})

ipcMain.handle('cache:get:player', () => cache.player.get())

ipcMain.handle('cache:set:player', (_, data: PlayerCacheData) => cache.player.set(data))

ipcMain.handle('cache:reset:all', async () => {
  const ok = resetAllCache()
  await cache.meta.clear()
  songPathsByUid = new Map()
  return ok
})

ipcMain.handle('cache:clear:invalidAlbumArt', (_, albumArts: string[]) => cache.cover.clear(new Set(albumArts)))

ipcMain.handle('set-window-title', (_, title: string) => {
  currentTitle = title
  mainWindow?.setTitle(currentTitle)
  tray?.setToolTip(currentTitle)
})

ipcMain.on('update:check', (_, data) => {
  isAutoCheckUpdate = data.auto
  autoUpdater.checkForUpdates().catch(() => {})
})
ipcMain.on('update:download', () => autoUpdater.downloadUpdate().catch(() => {}))
ipcMain.on('update:install', () => autoUpdater.quitAndInstall(false, true))
