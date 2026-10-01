/**
 * 开发环境 Electron 启动器（v3）：
 * vite-plugin-electron 已改为仅构建不启动（见 vite.config.ts 的 onstart），
 * 这里等待 main 产物就绪后再拉起 Electron，由 start 脚本的 concurrently 与 vite 并行。
 */
const { spawn } = require('child_process')
const { existsSync } = require('fs')
const { join } = require('path')

const mainEntry = join(__dirname, '../dist-electron/main.js')
const devServerUrl = 'http://localhost:3000'
const MAX_WAIT_MS = 30000
const started = Date.now()

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** dev server 就绪探测（Electron 加载页面前 vite 必须已可访问） */
async function waitDevServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(devServerUrl)
      if (res.ok) return
    } catch {
      // server 未就绪，继续等待
    }
    await sleep(500)
  }
  console.error('[devElectron] 等待 vite dev server 超时')
  process.exit(1)
}

/** 等 main.js 出现且体积稳定——插件 dev 构建会先 emptyOutDir 再写回，避免启动到"已清空未写回"的窗口 */
async function waitMainStable() {
  for (;;) {
    if (existsSync(mainEntry)) {
      const size = require('fs').statSync(mainEntry).size

      await sleep(1000)
      if (existsSync(mainEntry) && require('fs').statSync(mainEntry).size === size) return
    } else if (Date.now() - started > MAX_WAIT_MS) {
      console.error('[devElectron] 等待 dist-electron/main.js 超时，请确认 vite dev server 已启动')
      process.exit(1)
    }
    await sleep(300)
  }
}

async function main() {
  // 先等 dev server 可访问，再等 main 产物稳定（期间插件可能正在清空重建 dist-electron）
  await waitDevServer()
  await waitMainStable()
  console.log('[devElectron] main.js 与 dev server 就绪，启动 Electron')
  // ELECTRON_RUN_AS_NODE 会让 electron 退化成纯 Node（require('electron') 拿不到 app），
  // 从 Electron 宿主的终端里启动时该变量可能被继承，必须摘掉
  const env = { ...process.env, NODE_ENV: 'development' }
  delete env.ELECTRON_RUN_AS_NODE
  // Windows 下 electron 命令是 .cmd，需要 shell 才能解析
  // --remote-debugging-port 供 scripts/diagFolders.cjs 诊断使用
  spawn('electron', ['.', '--remote-debugging-port=9222'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  })
}

main()
