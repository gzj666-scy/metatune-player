import { BrowserWindow, app, shell } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

export const getWindow = (): BrowserWindow | null => mainWindow

export async function createWindow(onReadyToShow?: () => void): Promise<void> {
  mainWindow = new BrowserWindow({
    width: isDev ? 1600 : 1100,
    height: 700,
    title: app.getName(),
    minWidth: 1000,
    minHeight: 640,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: false,
    },
    frame: isDev, // 隐藏窗口的顶部菜单栏和标题栏
    titleBarStyle: 'hiddenInset',
    show: false,
  })

  // 处理外部链接（在默认浏览器中打开）
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    onReadyToShow?.()
  })

  // macOS：窗口显示时恢复 dock
  mainWindow.on('show', () => {
    if (process.platform === 'darwin') app.dock?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 阻止网页修改标题
  mainWindow.webContents.on('page-title-updated', event => event.preventDefault())

  if (isDev) {
    await loadDevServer(mainWindow)
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(join(__dirname, '../dist-web/index.html'))
  }
}

/** 等待 vite dev server 就绪后再加载（concurrently 并行启动时 Electron 可能先于 server 就绪） */
async function loadDevServer(win: BrowserWindow): Promise<void> {
  const url = 'http://localhost:3000'
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) break
    } catch {
      // server 未就绪，继续等待
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  await win.loadURL(url)
}

/** 关闭窗口：按设置决定隐藏到托盘还是退出 */
export function closeWindow(quit: boolean): void {
  if (quit) {
    app.quit()
    return
  }
  mainWindow?.hide()
  if (process.platform === 'darwin') app.dock?.hide()
}
