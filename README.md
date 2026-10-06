# Metatune Player（元音本地音乐播放器）

一个**本地音乐播放器**桌面应用。基于 Electron + Vue 3 构建，主打「把本地曲库播得响度一致、不忽大忽小」，并内置响度归一化、歌词、系统托盘、自动更新等能力。

> 项目代号 `metatune-player3`，对外品牌名 **Metatune Player** / 中文名 **元音播放器**。

---

## ✨ 功能特性

| 功能         | 说明                                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **本地曲库管理** | 扫描本地音乐目录，解析元数据（标题 / 艺人 / 专辑 / 编码 / 大小），建立歌单与收藏。                                                                                        |
| **响度归一化**  | 用 ITU-R BS.1770 算法逐首测量 Integrated LUFS 与 True Peak（dBTP），统一播放响度，告别「切歌忽大忽小」。默认目标响度 **-14 LUFS**、True Peak 上限 **-1.0 dBTP**（可在「高级设置」调整）。 |
| **防削波增益**  | 增益取「响度补偿」与「True Peak 上限」的较小值，优先保证不破峰。                                                                                                  |
| **本地音频服务** | 主进程起一个 Express 本地服务 + 自定义协议提供音频流，规避 `file://` 直读的限制与 CORS 问题。                                                                          |
| **歌词解析**   | 内置歌词文本解析器，支持滚动歌词展示。                                                                                                                    |
| **系统托盘**   | 最小化到托盘、托盘控制播放。                                                                                                                         |
| **设置中心**   | 三组设置页：**常规**（缓存路径等）、**高级**（响度归一化 / True Peak 上限 / 目标响度 / 扫描曲库）、**关于**（版本 / 更新）。                                                        |
| **缓存管理**   | 安装版缓存落在 `AppData\Roaming\Metatune Player\.cache`；便携版（`portable.exe`）缓存落在 **exe 同级** `.metatune-cache`，绿色无残留。                           |
| **自动更新**   | 通过 `electron-updater` 从 GitHub Releases 拉取更新（安装版）。                                                                                     |
| **干净卸载**   | 卸载向导提供「是否一并删除缓存与用户数据」复选框（默认勾选），可清除 AppData 缓存与更新库存档。                                                                                   |

---

## 🧱 技术栈

| 层级   | 技术                                                         |
| ---- | ---------------------------------------------------------- |
| 运行环境 | Electron 41                                                |
| 渲染框架 | Vue 3.5 + Vue Router 4 + Pinia                             |
| 构建   | Vite 5（`vite-plugin-electron`）                             |
| 音频播放 | Howler                                                     |
| 响度测量 | `lufs-web`（BS.1770 / 4× 过采样 True Peak，跑在 Web Worker 不卡主线程） |
| 元数据  | `music-metadata`                                           |
| 本地服务 | Express + CORS                                             |
| 自动更新 | `electron-updater`                                         |
| 语言   | TypeScript（strict 全开）                                      |
| 包管理  | pnpm workspace（monorepo）                                   |

---

## 📁 仓库结构

```
metatune-player3/
├── apps/
│   ├── desktop/          # Electron 桌面端（主战场）★ 见下
│   └── mobile/           # uni-app 移动端（已冻结，移出 workspace）
├── packages/
│   └── common/           # 跨端共享 TS：types / hooks / utils（无构建步骤）
├── scripts/              # 根级工具脚本（如 sort-pkg.cjs）
├── AGENTS.md             # 开发规则——写代码的「唯一事实源」
├── pnpm-workspace.yaml
└── package.json
```

### `apps/desktop` 内部结构

```
apps/desktop/
├── electron/
│   └── src/              # 主进程代码
│       ├── ipc/          # IPC 通道定义 + 注册（channels.ts / index.ts）
│       ├── main.ts       # 入口（窗口 / 生命周期 / userData 重定向）
│       ├── window.ts     # 浏览器窗口
│       ├── tray.ts       # 系统托盘
│       ├── appCache.ts   # 缓存目录解析（便携 / 安装分流）
│       ├── audioScanner.ts   # 曲库扫描
│       ├── audioServer.ts    # Express 本地音频服务
│       ├── parseMetadata.ts  # 元数据解析
│       ├── protocol.ts       # 自定义协议
│       ├── updater.ts        # 自动更新（便携版禁用）
│       └── preload.ts        # 上下文隔离桥接（白名单暴露 electronAPI）
├── src/                  # 渲染进程（Vue 3）
│   ├── components/       # base / business / layout / modal / panel / settings
│   │   └── settings/     # General.vue / Advanced.vue / About.vue
│   ├── composables/      # usePlayerControls / useSliderDrag / useSpectrum
│   ├── store/            # Pinia
│   ├── views/            # Collection / Player / Settings / SongList
│   ├── workers/
│   │   └── loudness.worker.ts  # BS.1770 响度 / True Peak 测量
│   └── main.ts
├── build/
│   └── installer.nsh     # NSIS 卸载钩子（可选清除缓存）
├── resources/icons/      # icon / installer / uninstaller / header .ico
└── package.json          # 构建配置（nsis + portable + mac）
```

---

## 🚀 快速开始

### 环境要求

- **Node** `>= 20.19.0`
- **pnpm** `>= 9`（仓库 `packageManager` 锁定 `pnpm@10.33.0`，请用 pnpm，已用 `only-allow pnpm` 强制）
- Windows / macOS 用于对应平台打包

### 安装依赖

```bash
pnpm install
```

> 全新克隆后 Electron 二进制需由依赖构建脚本生成，`pnpm-workspace.yaml` 已 `onlyBuiltDependencies` 放行 `electron` / `esbuild` 等，正常 `pnpm install` 即可。

### 开发模式

桌面端开发需同时跑 Vite 开发服务器和 Electron 主进程：

```bash
# 一步启动（concurrently 同时拉起 vite + electron）
pnpm --filter @metatune/desktop start
```

或分开跑：

```bash
pnpm --filter @metatune/desktop dev         # Vite 开发服务器
pnpm --filter @metatune/desktop dev:electron # Electron 主进程
```

### 常用脚本

在 `apps/desktop`（`pnpm --filter @metatune/desktop <script>`）或仓库根（`pnpm -r <script>`）执行：

| 脚本                                       | 作用                                     |
| ---------------------------------------- | -------------------------------------- |
| `start`                                  | 开发模式：Vite + Electron 同时启动              |
| `dev` / `dev:electron`                   | 单独启动 Vite / Electron                   |
| `build`                                  | 仅 `vite build`（渲染产物）                   |
| `build:win`                              | 构建并打包 Windows（nsis 安装版 + portable 便携版） |
| `build:mac`                              | 构建并打包 macOS（dmg + zip）                 |
| `build:app`                              | 构建并按当前平台打包                             |
| `type-check`                             | 全量类型检查（`vue-tsc` web + electron）       |
| `type-check:web` / `type-check:electron` | 仅渲染端 / 仅主进程类型检查                        |
| `rebuild:native`                         | `electron-rebuild` 重编译原生模块             |

根仓库还提供：`format`（Prettier）、`lint`（ESLint）、`lint:style`（Stylelint）、`check`（全量检查）。

---

## 📦 构建与分发

打包产物输出到 `apps/desktop/release/`。

| 平台      | Target            | 产物命名                                              |
| ------- | ----------------- | ------------------------------------------------- |
| Windows | `nsis`（向导安装）      | `Metatune-Player-Setup-${version}-${arch}.exe`    |
| Windows | `portable`（单文件便携） | `Metatune-Player-Portable-${version}-${arch}.exe` |
| macOS   | `dmg` / `zip`     | `Metatune-Player-${version}-${arch}.{dmg,zip}`    |

- **安装版**：默认用户级安装（`perMachine: false`），可改安装目录；卸载向导带「删除缓存与用户数据」复选框。
- **便携版**：单文件 exe，缓存与用户数据全部落在 exe 同级目录，更新功能自动禁用（便携形态无法原地自更新）。
- **自动更新**：安装版通过 GitHub Releases（`publish.provider: github`）分发增量/全量更新。

### 缓存目录约定

| 形态  | 缓存目录                                                       |
| --- | ---------------------------------------------------------- |
| 开发态 | 项目根 `.metatune-cache/`                                     |
| 安装版 | `%APPDATA%\Roaming\Metatune Player\.cache`                 |
| 便携版 | `<exe 所在目录>\.metatune-cache\`（含 `userData` / `crashDumps`） |

「常规设置 → 缓存」页会显示当前生效的缓存路径。

---

## 🏗️ 架构要点

- **主进程 / 渲染进程分离**：渲染进程是标准 Vue 3 SPA；主进程负责窗口、托盘、曲库扫描、本地音频服务、自动更新、缓存与卸载逻辑。
- **上下文隔离**：通过 `preload.ts` 白名单暴露 `window.electronAPI`，主进程能力不泄露到渲染层。
- **响度测量在 Worker**：BS.1770 测量（LUFS + True Peak）在 `loudness.worker.ts` 中执行，避免阻塞 UI / 主线程；主线程解码出 PCM 后传给 Worker。
- **数据持久化**：设置与每首歌的增益 / LUFS / True Peak 存入用户数据（安装版 AppData，便携版 exe 同级）。

---

## 🔧 开发约定

本仓库有一份 **`AGENTS.md`**，它是写代码的**唯一事实源**，涵盖：

- 模块体系（一律 ESM / 一律 TS / SFC 写法）
- 格式规范（Prettier：行宽 150、单引号、无分号、尾逗号 es5 …）
- ESLint / Stylelint / TypeScript 红线
- 路径别名（`@/` → 渲染端 `src`；`@metatune/common` → 共享包；`common` 内部禁 `@/`）
- 依赖管理（pnpm + catalog，谁 import 谁声明）
- 分层约束（共享包同构、主进程不打 electron、不加 tsc 步骤）
- **红线**：不要主动跑全量 lint/format 检查；不动 `node_modules`、`release/`、`.workbuddy/` 等；保留用户 `console.log` …

修改代码前请先读 `AGENTS.md`。

---

## 📄 许可证

[MIT](apps/desktop/LICENSE) © gzj666-scy
