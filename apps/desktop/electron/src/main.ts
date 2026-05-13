import { app, BrowserWindow, ipcMain, shell, dialog, protocol } from 'electron'
import { fileURLToPath } from 'url'
import { join } from 'path'
import { AudioStreamServer } from './audioServer.js'
import { AudioFormat, parseMetadata } from './parseMetadata.js'
import { cache, COVER_DIR } from './appCache'
import { stat } from 'fs/promises'
import { IAppSettings, IPlaybackState, IPlaylist, ISong } from '@metatune/common/types'
import { getMimeType } from './utils.js'
import { createReadStream } from 'fs'
import { autoUpdater } from 'electron-updater'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

process.env.APP_ROOT = join(__dirname, '..')

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let audioServer: AudioStreamServer | null = null

// 🔑 关键：生产环境才启用自动更新
if (!app.isPackaged) {
  // 开发环境：指向本地测试服务器（可选）
  Object.defineProperty(app, 'isPackaged', { value: true })
  autoUpdater.updateConfigPath = join(__dirname, '../', 'dev-app-update.yml')
}

// 必须在 app.whenReady() 之前注册
protocol.registerSchemesAsPrivileged([{ scheme: 'cache', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false } }])

let isAutoCheckUpdate = false
const setupAutoUpdater = () => {
  // 禁止自动下载，由用户确认后触发
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // 监听更新事件
  autoUpdater.on('checking-for-update', () => {
    console.error('checking-for-update')
    mainWindow?.webContents.send('update-status', { status: 'checking', auto: isAutoCheckUpdate })
  })

  autoUpdater.on('update-available', info => {
    console.error('update-available:', info)
    mainWindow?.webContents.send('update-status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
      auto: isAutoCheckUpdate,
    })
  })

  autoUpdater.on('update-not-available', () => {
    console.error('update-not-available')
    mainWindow?.webContents.send('update-status', { status: 'not-available', auto: isAutoCheckUpdate })
  })

  autoUpdater.on('download-progress', progress => {
    console.error('download-progress:', progress)
    mainWindow?.webContents.send('update-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', info => {
    console.error('update-downloaded:', info)
    mainWindow?.webContents.send('update-status', {
      status: 'downloaded',
      version: info.version,
      auto: isAutoCheckUpdate,
    })
  })

  autoUpdater.on('error', err => {
    console.error('更新错误:', err)
    mainWindow?.webContents.send('update-status', {
      status: 'error',
      message: err.message,
      auto: isAutoCheckUpdate,
    })
  })

  // 检查更新（启动时 + 手动触发）
  // setTimeout(() => {
  //   autoUpdater.checkForUpdates().catch(console.error)
  // }, 3000)
}

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    // frame: false, // 隐藏窗口的顶部菜单栏和标题栏
    frame: true,
    titleBarStyle: 'hiddenInset',
    show: false,
  })

  // 🚀 初始化自动更新
  setupAutoUpdater()

  // 初始化音频流服务
  audioServer = new AudioStreamServer()
  audioServer.start()

  // 准备就绪后显示窗口
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  // 处理外部链接（在新窗口中打开）
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // // 允许特定域名的链接
    // if (url.startsWith('https://example.com')) {
    //     return { action: 'allow' };
    // }
    // // 其他链接在默认浏览器中打开
    // require('electron').shell.openExternal(url);
    // return { action: 'deny' };

    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // 处理窗口关闭
  mainWindow.on('closed', () => {
    mainWindow = null
    audioServer?.stop()
    audioServer = null
  })

  // 开发环境加载本地服务器，生产环境加载打包文件
  if (isDev) {
    await mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(join(__dirname, '../dist-web/index.html'))
    mainWindow.webContents.openDevTools()
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

  await createWindow()

  // macOS: 点击dock图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用（macOS除外）
// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit()
//   }
// })

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

ipcMain.handle('window:close', () => {
  if (mainWindow) {
    mainWindow.close()
  }
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

ipcMain.handle('cache:set:localList', async (_, data: ISong[]) => {
  return cache.meta.set(data)
})

ipcMain.handle('cache:get:player', () => {
  return cache.player.get()
})

ipcMain.handle('cache:set:player', async (_, data: { playlists: IPlaylist; settings: IAppSettings; state: IPlaybackState }) => {
  return cache.player.set(data)
})

// IPC：渲染进程触发更新操作
ipcMain.on('update:check', (event, data) => {
  isAutoCheckUpdate = data.auto
  autoUpdater.checkForUpdates()
})
ipcMain.on('update:download', () => autoUpdater.downloadUpdate())
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
