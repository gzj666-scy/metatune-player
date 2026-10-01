import { app, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import { join } from 'path'
import { createWindow, getWindow } from './window'
import { createTray } from './tray'
import { registerCacheProtocol, handleCacheProtocol } from './protocol'
import { setupAutoUpdater } from './updater'
import { AudioStreamServer } from './audioServer'
import { registerIpcHandlers } from './ipc'
import { IPC } from './ipc/channels'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
process.env.APP_ROOT = join(__dirname, '..')

const isDev = process.env.NODE_ENV === 'development'

// 必须在 app.whenReady() 之前注册协议 scheme
registerCacheProtocol()

let audioServer: AudioStreamServer | null = null

/** 退出前通知渲染层保存数据（防止 app.quit 时 beforeunload 不触发导致状态丢失） */
let flushHandled = false
app.on('before-quit', event => {
  if (flushHandled) return
  const win = getWindow()
  if (!win || win.isDestroyed()) return
  event.preventDefault()
  flushHandled = true
  // 兜底：渲染层 1.5s 内未确认也强制退出
  const fallback = setTimeout(() => app.quit(), 1500)
  ipcMain.once(IPC.APP_FLUSHED, () => {
    clearTimeout(fallback)
    app.quit()
  })
  win.webContents.send(IPC.APP_FLUSH)
})

app.whenReady().then(async () => {
  // IPC handler 必须在窗口加载页面前注册完毕：createWindow 内部会等待页面加载，
  // 渲染层 onMounted 会立即调用 cache 类 IPC，注册滞后会报 "No handler registered"
  audioServer = new AudioStreamServer()
  await audioServer.start()
  registerIpcHandlers(audioServer)

  await handleCacheProtocol()
  await createWindow()
  createTray()

  // 初始化自动更新
  const win = getWindow()
  if (win) {
    setupAutoUpdater((channel, data) => win.webContents.send(channel, data))
  }

  if (isDev) console.log('开发环境启动完成')
})

app.on('activate', () => {
  // macOS：点击 dock 图标重建窗口
  if (getWindow() === null) createWindow()
})

app.on('window-all-closed', () => {
  // 所有窗口关闭时退出应用（macOS除外）
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  audioServer?.stop()
  audioServer = null
})
