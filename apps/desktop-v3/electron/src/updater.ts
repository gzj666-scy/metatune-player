import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { IPC } from './ipc/channels'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

let isAutoCheck = false
let initialized = false

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
  isAutoCheck = auto
  autoUpdater.checkForUpdates().catch(() => {})
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch(() => {})
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall(false, true)
}
