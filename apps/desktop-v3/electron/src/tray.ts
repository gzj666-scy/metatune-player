import { Tray, Menu, app, nativeImage } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { getWindow } from './window'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const isDev = process.env.NODE_ENV === 'development'

let tray: Tray | null = null

export function createTray(): void {
  const iconPath = isDev ? join(__dirname, '../resources/icons', 'icon.ico') : join(process.resourcesPath, 'icons', 'icon.ico')
  const trayIcon = nativeImage.createFromPath(iconPath)
  // macOS：模板图标自动适配深色模式
  if (process.platform === 'darwin') trayIcon.setTemplateImage(true)

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        getWindow()?.show()
        getWindow()?.focus()
        if (process.platform === 'darwin') app.dock?.show()
      },
    },
    {
      label: '退出',
      click: () => app.quit(),
    },
  ])
  tray.setContextMenu(contextMenu)

  // 单击托盘图标切换窗口显示
  tray.on('click', () => {
    const win = getWindow()
    if (win?.isVisible()) {
      win.hide()
    } else {
      win?.show()
      win?.focus()
    }
  })
}

export function setTrayToolTip(title: string): void {
  // 鼠标悬停提示
  tray?.setToolTip(title)
}
