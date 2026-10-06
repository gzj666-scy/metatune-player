/**
 * dev 诊断脚本：通过 CDP 连接 Electron 渲染进程，直接检查 pinia store 的文件夹视图状态。
 * 用法：先 pnpm start（devElectron 带 --remote-debugging-port=9222），再 node scripts/diagFolders.cjs
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http')

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, res => {
        let data = ''
        res.on('data', c => (data += c))
        res.on('end', () => resolve(JSON.parse(data)))
      })
      .on('error', reject)
  })
}

async function main() {
  const targets = await getJson('http://127.0.0.1:9222/json')
  const page = targets.find(t => t.type === 'page' && t.url.includes('127.0.0.1:5173'))
  if (!page) {
    console.log(
      '未找到渲染进程页面 target，targets:',
      targets.map(t => `${t.type} ${t.url}`)
    )
    return
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  const consoleLogs = []
  ws.addEventListener('message', raw => {
    const msg = JSON.parse(raw.data)
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleLogs.push(msg.params.args.map(a => (a.value !== undefined ? String(a.value) : a.type)).join(' '))
    }
  })
  ws.send(JSON.stringify({ id: 9999, method: 'Runtime.enable' }))

  let id = 0
  const pending = new Map()
  ws.onmessage = e => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  function evaluate(expression) {
    return new Promise(resolve => {
      const mid = ++id
      pending.set(mid, msg => resolve(msg.result))
      ws.send(JSON.stringify({ id: mid, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }))
    })
  }

  const expr = `(async () => {
    const app = document.querySelector('#app').__vue_app__
    const gp = app.config.globalProperties
    const store = gp.$pinia._s.get('player')
    const sleep = ms => new Promise(r => setTimeout(r, ms))
    for (let i = 0; i < 50 && store.songs.length === 0; i++) await sleep(200)
    const name0 = store.folderLists[0].name
    store.currentViewKey = 'folder'
    store.currentFolderName = name0
    await sleep(200)
    return {
      currentFolderSongs长度: store.currentFolderSongs.length,
      前6首: store.currentFolderSongs.map(s => s.title + (s.isValid ? '' : ' [失效]')),
    }
  })()`

  await evaluate('location.reload()')
  await new Promise(r => setTimeout(r, 3000))
  await new Promise(r => setTimeout(r, 500))
  const res = await evaluate(expr)
  await new Promise(r => setTimeout(r, 800))
  console.log('=== 页面 console ===')
  consoleLogs.slice(-12).forEach(l => console.log('  ', l))
  console.log('=== 结果 ===')
  if (res.exceptionDetails) console.log('EXCEPTION:', JSON.stringify(res.exceptionDetails.exception?.description))
  console.log(JSON.stringify(res.result?.value ?? res, null, 2))
  ws.close()
  process.exit(0)
}

main().catch(err => {
  console.error('诊断失败:', err.message)
  process.exit(1)
})
