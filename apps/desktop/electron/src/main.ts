import { app, BrowserWindow, ipcMain, shell, dialog, protocol, Tray, nativeTheme, nativeImage, Menu, powerSaveBlocker } from 'electron'
import { fileURLToPath } from 'url'
import { join } from 'path'
import { AudioStreamServer } from './audioServer.js'
import { AudioFormat, parseMetadata } from './parseMetadata.js'
import { cache, COVER_DIR, getCacheDir, resetAllCache } from './appCache'
import { stat } from 'fs/promises'
import { IAppSettings, IPlaybackState, IPlaylist, ISong } from '@metatune/common/types'
import { getMimeType } from './utils.js'
import { createReadStream } from 'fs'
import { autoUpdater } from 'electron-updater'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

process.env.APP_ROOT = join(__dirname, '..')

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let audioServer: AudioStreamServer | null = null
let currentTitle = '元音播放器'
let isAutoCheckUpdate = false
let powerBlockId: number
// 区分主动退出和用户关闭
// let isQuiting = false

// 禁止浏览器对后台页面的定时器（setTimeout / setInterval）进行节流（throttling）。
// app.commandLine.appendSwitch('disable-background-timer-throttling')
// 阻止 Chromium 在渲染进程（renderer process）失去焦点或隐藏时，降低其优先级或暂停其活动。
// app.commandLine.appendSwitch('disable-renderer-backgrounding')
// 禁用音频服务（Audio Service）的沙箱。
// app.commandLine.appendSwitch('disable-features', 'AudioServiceSandbox')

/*********************** 检查更新 ***********************/
app.setAppUserModelId('com.gzj666-scy.metatune')
if (!app.isPackaged) {
  // 开发环境：指向本地测试服务器（可选）
  Object.defineProperty(app, 'isPackaged', { value: true })
  autoUpdater.updateConfigPath = join(__dirname, '../', 'dev-app-update.yml')
}
const setupAutoUpdater = () => {
  // 禁止自动下载，由用户确认后触发
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // 监听更新事件
  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', { status: 'checking', auto: isAutoCheckUpdate })
  })

  autoUpdater.on('update-available', info => {
    mainWindow?.webContents.send('update-status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
      auto: isAutoCheckUpdate,
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-status', { status: 'not-available', auto: isAutoCheckUpdate })
  })

  autoUpdater.on('download-progress', progress => {
    mainWindow?.webContents.send('update-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', info => {
    mainWindow?.webContents.send('update-status', {
      status: 'downloaded',
      version: info.version,
      auto: isAutoCheckUpdate,
    })
  })

  autoUpdater.on('error', err => {
    mainWindow?.webContents.send('update-status', {
      status: 'error',
      message: err.message,
      auto: isAutoCheckUpdate,
    })
  })
}

/*********************** 注册自定义协议 ***********************/
// 必须在 app.whenReady() 之前注册
protocol.registerSchemesAsPrivileged([{ scheme: 'cache', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false } }])

/*********************** 创建托盘 ***********************/
const createTray = () => {
  // 1. 根据系统主题加载不同图标（macOS 必须用模板图标）
  // const iconPath = join(
  //   __dirname,
  //   '../resources/icons',
  //   process.platform === 'darwin' ? (nativeTheme.shouldUseDarkColors ? 'iconTemplate@2x.png' : 'iconTemplate@2x.png') : 'icon.ico'
  // )

  const iconPath = isDev ? join(__dirname, '../resources/icons', 'icon.ico') : join(process.resourcesPath, 'icons', 'icon.ico')

  const trayIcon = nativeImage.createFromPath(iconPath)

  // macOS 特殊处理：模板图标自动适配深色模式
  if (process.platform === 'darwin') {
    trayIcon.setTemplateImage(true)
  }

  tray = new Tray(trayIcon)
  tray.setToolTip(currentTitle) // 鼠标悬停提示

  // 2. 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        // macOS: 确保应用激活
        if (process.platform === 'darwin') {
          app.dock?.show()
        }
      },
    },
    {
      label: '退出',
      click: () => {
        // isQuiting = true // 标记为主动退出
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  // 3. 单击托盘图标恢复窗口（跨平台兼容）
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
const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: isDev ? 1600 : 1100,
    height: 700,
    title: currentTitle,
    minWidth: 1000,
    minHeight: 640,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true, // ✅ 必须开启
      nodeIntegration: false, // ✅ 必须关闭
      webSecurity: true, // ✅ 必须开启（启用 CSP）
      sandbox: false, // ✅ 强烈建议开启（Electron 20+ 默认）
    },
    frame: isDev ? true : false, // 隐藏窗口的顶部菜单栏和标题栏
    titleBarStyle: 'hiddenInset',
    // macOS 特殊：隐藏标题栏按钮（可选）
    // titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    // 关键：隐藏任务栏图标（仅托盘显示）
    skipTaskbar: false, // 保持任务栏图标，用户可手动最小化
  })

  // 初始化自动更新
  setupAutoUpdater()

  // 初始化音频流服务
  audioServer = new AudioStreamServer()
  audioServer.start()

  // 处理外部链接（在默认浏览器中打开）
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // 准备就绪后显示窗口
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  // 窗口显示时恢复 dock（macOS）
  mainWindow.on('show', () => {
    if (process.platform === 'darwin') {
      app.dock?.show()
    }
  })

  // 拦截关闭事件：最小化到托盘而非退出
  // mainWindow.on('close', event => {
  //   // 如果是主动退出（菜单点击"退出"），允许关闭
  //   if (isQuiting) {
  //     return
  //   }

  //   // 否则阻止默认关闭，隐藏窗口
  //   event.preventDefault()
  //   mainWindow?.hide()

  //   // macOS: 隐藏 dock 图标（可选）
  //   if (process.platform === 'darwin') {
  //     app.dock?.hide()
  //   }
  // })

  // 处理窗口关闭完成
  mainWindow.on('closed', () => {
    mainWindow = null
    audioServer?.stop()
    audioServer = null
  })

  // 阻止网页修改标题
  mainWindow.webContents.on('page-title-updated', event => {
    event.preventDefault()
  })

  // 或显式设置标题（确保在 loadURL 之后）
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.setTitle(currentTitle)
  })

  // 开发环境加载本地服务器，生产环境加载打包文件
  if (isDev) {
    await mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(join(__dirname, '../dist-web/index.html'))
    // mainWindow.webContents.openDevTools()
  }
}
// app.commandLine.appendSwitch('enable-gpu-compositing')
// app.commandLine.appendSwitch('ignore-gpu-blacklist')
// 应用准备就绪
app.whenReady().then(async () => {
  // 设置协议处理器
  protocol.handle('cache', async request => {
    const url = decodeURIComponent(request.url.slice('cache://'.length))
    const filePath = join(COVER_DIR, url)
    // 检查文件是否存在
    const stats = await stat(filePath)
    if (!stats.isFile()) return new Response('Forbidden', { status: 403 })
    // 推断 MIME 类型
    const contentType = getMimeType(filePath)
    // 返回标准 Fetch Response（支持流式加载，不阻塞内存）
    const stream = createReadStream(filePath)
    return new Response(stream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  })

  // 播放时阻止系统休眠/降频----阻止应用被暂停。保持系统活动状态，但允许屏幕关闭。
  // powerBlockId = powerSaveBlocker.start('prevent-app-suspension')

  // 🔑 必须先创建窗口，再创建托盘（避免托盘先于窗口初始化）
  await createWindow()
  createTray()
})

app.on('will-quit', () => {
  // if (powerBlockId !== undefined) powerSaveBlocker.stop(powerBlockId)
})

// macOS: 点击dock图标时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
  }
})

ipcMain.handle('window:minimize', () => {
  if (mainWindow) {
    mainWindow.minimize()
  }
})

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('window:close', (_, quit: boolean) => {
  if (quit) {
    app.quit()
  } else {
    mainWindow?.hide()
    // macOS: 隐藏 dock 图标（可选）
    if (process.platform === 'darwin') {
      app.dock?.hide()
    }
  }
  // mainWindow?.close()
})

// 处理文件导入
ipcMain.handle('dialog:openFile', async (_, options: Omit<Electron.OpenDialogOptions, 'properties' | 'filters'>) => {
  const results = await dialog.showOpenDialog(mainWindow as BrowserWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '音频文件', extensions: AudioFormat }],
    ...options,
  })
  return results
})

// 处理文件夹导入
ipcMain.handle('dialog:openDirectory', async () => {
  const results = await dialog.showOpenDialog(mainWindow as BrowserWindow, {
    properties: ['openDirectory'],
  })
  return results
})

// 解析音频文件元数据
ipcMain.handle('audio:parseMetadata', async (_, filePaths: string[]) => {
  const results: ISong[] = []
  for (const filePath of filePaths) {
    const result = await parseMetadata(filePath)
    if (result) results.push(...result)
  }
  return results
})

// 获取音频文件流地址
ipcMain.handle('audio:streamUrl', (_, filePath: string) => {
  try {
    const content = audioServer!.getStreamUrl(filePath)
    return content
  } catch (error) {
    console.error('Failed to streamUrl:', error)
    return null
  }
})

// ipcMain.handle('storage:get', (_, key: string) => {
//     return getStore(key)
// })

// ipcMain.handle('storage:set', async (_, data: { key: string, data: any }) => {
//     return saveStore(data.key, data.data)
// })

ipcMain.handle('cache:get:localList', () => {
  return cache.meta.get()
})

ipcMain.handle('cache:set:localList', (_, data: ISong[]) => {
  return cache.meta.set(data)
})

ipcMain.handle('cache:get:player', () => {
  return cache.player.get()
})

ipcMain.handle('cache:set:player', (_, data: { songDirs: string[]; playlists: IPlaylist; settings: IAppSettings; state: IPlaybackState }) => {
  return cache.player.set(data)
})

ipcMain.handle('cache:reset:all', () => {
  return resetAllCache()
})

ipcMain.handle('cache:clear:invalidAlbumArt', (_, albumArts: Set<string | undefined>) => {
  return cache.cover.clear(albumArts)
})

// 监听渲染进程的语言切换请求
ipcMain.handle('set-window-title', (_, title: string) => {
  currentTitle = title
  mainWindow?.setTitle(currentTitle)
  tray?.setToolTip(currentTitle)
})

// IPC：渲染进程触发更新操作
ipcMain.on('update:check', (event, data) => {
  isAutoCheckUpdate = data.auto
  autoUpdater.checkForUpdates().catch(() => {})
})
ipcMain.on('update:download', () => autoUpdater.downloadUpdate().catch(() => {}))
ipcMain.on('update:install', () => {
  autoUpdater.quitAndInstall(false, true) // 不强制关闭，重启后安装
})

// 读取歌词文件
// ipcMain.handle('lyric:readFile', async (event, lyricPath) => {
//     try {
//         const content = await readFile(lyricPath, { encoding: 'utf-8' });
//         return content;
//     } catch (error) {
//         console.error('Failed to read lyric file:', error);
//         return null;
//     }
// });

// 保存备份文件
// ipcMain.handle('file:saveBackup', async (event, content) => {
//     const result = await dialog.showSaveDialog(mainWindow as BrowserWindow, {
//         title: '保存备份文件',
//         defaultPath: `metatune-backup-${Date.now()}.json`,
//         filters: [{ name: 'JSON Files', extensions: ['json'] }]
//     });

//     if (!result.canceled && result.filePath) {
//         await writeFile(result.filePath, content, 'utf-8');
//         return result.filePath;
//     }
//     return null;
// });

// 加载备份文件
// ipcMain.handle('file:loadBackup', async (event) => {
//     const result = await dialog.showOpenDialog(mainWindow as BrowserWindow, {
//         title: '加载备份文件',
//         filters: [{ name: 'JSON Files', extensions: ['json'] }],
//         properties: ['openFile']
//     });

//     if (!result.canceled && result.filePaths.length > 0) {
//         const content = await readFile(result.filePaths[0], 'utf-8');
//         return { content, filePath: result.filePaths[0] };
//     }
//     return null;
// });

// "electron:dev": "npm run rebuild:native && npm run compile:electron && cross-env NODE_ENV=development electron .",
// ipcMain.handle('player:play-local', async (event, song: ISong) => {
//     if (!player) return null;
//     return await player.playLocalFile(song);
// });
