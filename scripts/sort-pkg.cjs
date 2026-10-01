// 适配本项目（pnpm monorepo）的 package.json 排序脚本。
//
// 直接用 sort-package-json 的 CLI 会连 scripts 也按字母序重排（CLI 没有
// 「跳过某字段」的开关），所以这里走 API：排序后把原始 scripts 原样放回，
// 只保留顶层字段序与依赖区的排序。
//
// 仓库是 monorepo，postinstall 会调用本脚本把所有 workspace 内的
// package.json 一并排序（apps/mobile 已冻结，显式排除）。
//
// 用法：
//   node scripts/sort-pkg.cjs "**/package.json" \
//     --ignore "**/node_modules/**" --ignore "apps/mobile"
// - 位置参数：要排序的 package.json 的 glob（默认 **/package.json，即仓库内全部）
// - --ignore <glob>：跳过匹配的文件/目录，可多次传入（node_modules 在遍历时硬跳过）
const fs = require('node:fs')
const path = require('node:path')

const { sortPackageJson } = require('sort-package-json')

const repoRoot = path.join(__dirname, '..')

// --- 极简 glob 匹配 -------------------------------------------------------
function escapeRegExp(str) {
  return str.replace(/[.+^${}()|[\]\\]/g, '\\$&')
}

// 包含匹配：把 `**/` 视为「零个或多个目录段」（所以 **/package.json 也能命中根目录的 package.json）
function toIncludeRegExp(glob) {
  const segments = glob.split('**')
  const parts = segments.map((segment, idx) => {
    const trimmed = segment.replace(/^\//, '')
    const body = trimmed.split('*').map(escapeRegExp).join('[^/]*')
    return (idx === 0 ? '' : '(?:.*/)?') + body
  })
  return new RegExp('^' + parts.join('') + '$')
}

// 忽略匹配：`**` 视为跨斜杠通配，并允许命中目录本身及其子项（apps/mobile 即此场景）
function toIgnoreRegExp(glob) {
  const segments = glob.split('**')
  const parts = segments.map(segment => {
    const trimmed = segment.replace(/^\//, '')
    return trimmed.split('*').map(escapeRegExp).join('[^/]*')
  })
  return new RegExp('^(?:.*/)?' + parts.join('.*') + '(?:/.*)?$')
}

// --- 解析参数 -------------------------------------------------------------
const includes = []
const ignores = []
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg === '--ignore') {
    const value = process.argv[++i]
    if (value) ignores.push(toIgnoreRegExp(value))
  } else if (arg.startsWith('--ignore=')) {
    ignores.push(toIgnoreRegExp(arg.slice('--ignore='.length)))
  } else {
    includes.push(toIncludeRegExp(arg))
  }
}

const includeRegs = includes.length ? includes : [toIncludeRegExp('**/package.json')]
const isIgnored = rel => ignores.some(re => re.test(rel))
const isIncluded = rel => includeRegs.some(re => re.test(rel))

// --- 递归收集 package.json（跳过 node_modules / .git） --------------------
const found = []
function walk(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // 依赖目录与 git 目录绝不碰
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      walk(full)
    } else if (entry.isFile() && entry.name === 'package.json') {
      const rel = path.relative(repoRoot, full).split(path.sep).join('/')
      if (!isIgnored(rel) && isIncluded(rel)) found.push(full)
    }
  }
}
walk(repoRoot)

// --- 逐个排序（保留 scripts 原序） ----------------------------------------
let changed = 0
for (const file of found) {
  const original = fs.readFileSync(file, 'utf8')
  let pkg
  try {
    pkg = JSON.parse(original)
  } catch {
    console.warn(`sort-pkg: 跳过无法解析的 ${file}`)
    continue
  }
  const sorted = sortPackageJson(pkg)
  // scripts 是团队手写的执行顺序（含 pre/post 钩子），不按字母序重排
  if (pkg.scripts) sorted.scripts = pkg.scripts
  const output = JSON.stringify(sorted, null, 2) + '\n'
  if (output !== original) {
    fs.writeFileSync(file, output)
    changed++
  }
}

if (changed > 0) {
  console.log(`sort-pkg: 已排序 ${changed} 个 package.json`)
}
