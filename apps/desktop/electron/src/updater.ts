import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { IPC } from './ipc/channels'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

let isAutoCheck = false
let initialized = false

/** 便携版（electron-builder portable target）：数据随 exe 走，安装器无法对其"升级"（只会拉起 Setup 重装），禁用更新功能 */
const isPortable = !!process.env.PORTABLE_EXECUTABLE_DIR

type SendStatus = (channel: string, data: unknown) => void

let sendStatus: SendStatus = () => {}

function send(status: string, extra: Record<string, unknown> = {}) {
  sendStatus(IPC.UPDATE_STATUS, { status, auto: isAutoCheck, ...extra })
}

/** 初始化自动更新（只需调用一次） */
export function setupAutoUpdater(sender: SendStatus): void {
  if (initialized) return
  initialized = true
  sendStatus = sender

  app.setAppUserModelId('com.gzj666-scy.metatune')

  // 便携版：只保留 AUMID（托盘/通知标识），不初始化更新器，也不重定向更新缓存（避免往 appData 写）
  if (isPortable) return

  // electron-updater 默认把更新缓存放在 LOCALAPPDATA/<updaterCacheDirName>（内部 hardcode 取 LOCALAPPDATA，
  // 改 package.json 的 updaterCacheDirName 只能改子文件夹名、挪不动基路径）。项目约定所有应用数据放
  // appData/Metatune Player 下，这里把缓存「基路径」重定向过去：
  // 最终缓存目录 = appData/Metatune Player/metatune-player-updater
  const updaterApp = (autoUpdater as unknown as { app: object }).app
  Object.defineProperty(updaterApp, 'baseCachePath', {
    configurable: true,
    get: () => join(app.getPath('appData'), 'Metatune Player'),
  })

  if (!app.isPackaged) {
    // 开发环境指向本地测试配置
    Object.defineProperty(app, 'isPackaged', { value: true })
    autoUpdater.updateConfigPath = join(__dirname, '../dev-app-update.yml')
  }

  // 禁止自动下载，由用户确认后触发
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => send('checking'))
  autoUpdater.on('update-available', info => send('available', { version: info.version, releaseNotes: info.releaseNotes }))
  autoUpdater.on('update-not-available', () => send('not-available'))
  autoUpdater.on('download-progress', progress => {
    sendStatus(IPC.UPDATE_PROGRESS, { percent: progress.percent, bytesPerSecond: progress.bytesPerSecond, total: progress.total })
  })
  autoUpdater.on('update-downloaded', info => send('downloaded', { version: info.version }))
  autoUpdater.on('error', err => send('error', { message: err?.message }))
}

export function checkForUpdates(auto: boolean): void {
  if (isPortable) return
  isAutoCheck = auto
  autoUpdater.checkForUpdates().catch(() => {})
}

export function downloadUpdate(): void {
  if (isPortable) return
  autoUpdater.downloadUpdate().catch(() => {})
}

export function installUpdate(): void {
  if (isPortable) return
  autoUpdater.quitAndInstall(false, true)
}
