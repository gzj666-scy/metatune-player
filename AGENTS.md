# metatune-player3 项目开发规则

pnpm monorepo 音乐播放器。本文件是写代码的**唯一事实源**：按下面的条款写出的代码即视为合规，**出生即合规，不要写完再修**。

## 0. 仓库结构与当前状态

| 包                 | 技术栈                                 | 状态                         |
| ----------------- | ----------------------------------- | -------------------------- |
| `apps/desktop`    | Electron 41 + Vue 3.5 + Vite 8 + TS | **主战场**                    |
| `packages/common` | 纯 TS（types / hooks / utils），无构建步骤   | 两端共享                       |
| `apps/mobile`     | uni-app + Vue 3 + Vite 5            | **已冻结**（移出 workspace，见 §7） |

根 `package.json` 只放工具链（eslint / prettier / stylelint / typescript / vue-tsc），**`dependencies` 恒为空**。

## 1. 模块体系

- **一律 ESM**：`import` / `export`。禁止 `require()` / `module.exports`（主进程产物虽被转成 CJS，但源码写 ESM，由 vite 负责转换）。
- **一律 TypeScript**。Electron 主进程也是 TS，不要改成 JS：编译由 `vite-plugin-electron` 负责、零额外成本，改 JS 会断开 `@metatune/common` 的跨包类型。
- Vue 组件一律 `<script setup lang="ts">`。
- 类型导入优先 `import type { X } from '...'`。

## 2. 格式规范（Prettier，`.prettierrc.yaml`）

- 行宽 **140**，缩进 **2 空格**，换行符 **LF**，文件末尾留一个换行，不留行尾空白
- **不加分号**（`for(;;)` 头部的分号保留）
- 字符串**单引号**；JSX / 模板属性同样单引号（`jsxSingleQuote`）
- 尾逗号 **es5**：对象、数组末项加；函数参数不加
- 对象大括号内留空格 `{ foo: bar }`；对象键引号仅在必要时加（`quoteProps: as-needed`）
- 箭头函数**单参数省略括号**：`x => x * 2`；多参数或无参数保留括号
- 标签属性不强制每行一个（`singleAttributePerLine: false`），超过 150 才换行

### SFC 特有

- `vueIndentScriptAndStyle: true` → `<script>` / `<style>` 内的代码**相对标签缩进一级**
- 块顺序固定 **`<script>` → `<template>` → `<style>`**（ESLint 报错级）
- 块与块之间**恰好空一行**（多了会被压成一个，少了自动补）

### ESLint 补的两条（Prettier 管不到）

- `import` 语句块之后**空一行**（连续 import 之间不需要）
- 见 §3 的结构类规则

## 3. 代码质量（ESLint，`eslint.config.mjs`）

**报错级**：

- 全等比较 `===` / `!==`（`eqeqeq`）
- 禁止变量遮蔽（`no-shadow`：内层变量不要与外层重名）
- 变量不能在声明前使用（函数声明提升**允许**，`functions: false`）
- import 块后空一行、SFC 块顺序与块间空行（§2）

**警告级**（不阻断，但新代码要遵守）：

- `console.*` —— 生产由 terser 的 `pure_funcs` 移除，**不要手动删用户的调试日志**
- 优先对象解构（数组不解构）：`const { name } = song`
- 命名小驼峰；对象属性名不检查；`_` 开头视为有意忽略
- 未使用变量（参数加 `_` 前缀可豁免）
- `any` 仅警告（迁移期），但新代码不要新增

**可用全局**：渲染进程 `browser`；主进程 / `scripts/**` / `*.config.*` 追加 `node`；`apps/mobile` 追加 `uni` `wx` `plus` `getApp` `getCurrentPages`。

## 4. TypeScript（`tsconfig.json` 为基底）

- `strict` 全开，另加 `noUnusedLocals` / `noUnusedParameters` / `noFallthroughCasesInSwitch`
  → **写了不用的变量、参数是 TS 报错（TS6133），不是 lint 警告**
- `isolatedModules: true` → 重导出类型必须写 `export type { X }`
- `moduleResolution: bundler` → 导入路径**不写 `.ts` 扩展名**
- 路径别名：
  - `apps/desktop` 内部用 `@/` → `apps/desktop/src/*`
  - 跨包用 `@metatune/common` → `packages/common/src`（源码，不是构建产物）
  - **`packages/common` 内部一律相对路径，禁止 `@/`** —— desktop 的 `@/` 指向它自己的 `src`，两边都存在 `src/utils/constant.ts`，用别名会**静默解析到错误的那一份**

## 5. 样式（SCSS + Stylelint）

- 新样式一律 `<style lang="scss">`（现存 27/30 是这个）
- 基线 `stylelint-config-standard`；`.vue` 由 `stylelint-config-standard-vue/scss` 接管，独立 `.scss` 由 `stylelint-config-standard-scss` 接管
- 新写的颜色用 **modern 写法**：`rgb(0 0 0 / 40%)`、能缩写的 hex 写 3 位；`0` 不加单位（`0px` → `0`）
- 存量代码仍有 112 处 `rgba()`、218 处 6 位 hex 未清理，**不要顺手改**（要改单独一次提交）

## 6. 分层约束（最容易踩）

- `packages/common` 是**同构**的，会被渲染进程和 Electron 主进程同时 import：
  - 不要在里面用 DOM API（主进程没有 DOM）
  - 不要在里面用 `uni` / `wx` 全局（桌面端没有）
  - 主进程 / preload 只导入它的**纯类型**：`@metatune/common/types`
- Electron 主进程（`apps/desktop/electron/src`）：
  - **不要试图把 `electron` 打进 bundle** —— `vite-plugin-electron` 已自动 external，手动配置反而会坏（electron 的 npm 包只是指向二进制的 shim，打包后路径失效）
  - **不要加 `tsc` 编译步骤**，产物由插件输出；类型检查走 `type-check:electron`

## 7. 依赖管理（pnpm 10.33 + workspace）

本仓库**已关闭 public hoist**，未声明的依赖会直接 `MODULE_NOT_FOUND`：

- **谁 import，谁声明**。新依赖装到实际使用它的那个子包，不要装到根
- 根 `dependencies` 保持 `{}`
- 版本统一走 `pnpm-workspace.yaml` 的 catalog。新增时用 `pnpm add --save-catalog <pkg>`（catalog-mode 默认 manual，不会自动写成 `catalog:`）；跨端依赖用命名 catalog，如 `catalog:uni-app`
- 装包：`pnpm install --prefer-offline`（registry 已切 npmmirror）。只删依赖、版本号没动时可 `pnpm install --offline`
- 改 `.npmrc` 里布局类配置（node-linker / hoist 相关）后**必须删掉 `node_modules` 重装**，否则旧链接残留、配置不生效
- 只用 pnpm（`preinstall` 有 `only-allow pnpm`）

## 8. 函数风格（个人约定，配置不检查）

用箭头函数：

- 回调：`items.map(item => ...)`
- 模板里的内联事件：`@click="() => setOpen(true)"`
- 简短纯函数：`const double = x => x * 2`
- 函数内需要继承外层 `this` 的函数

用 `function` 声明：

- 组合式函数（composables）：`function usePlayer() {}`
- 工具函数、顶层具名函数
- 需要提升 / `arguments` / generator（`function*`）
- 需要动态 `this` 的对象方法、类方法
- 其他不需用 `this` 的普通事件处理器、方法

补充：

- 模板里不写多行内联逻辑 —— 提出为具名 handler（`handleXxx`）再传入

## 9. 红线（覆盖一切任务）

1. **不要主动跑全量检查**（`prettier --check .` / `eslint .` / `stylelint "**/*"` / `pnpm check`）。按本文件写即合规；跑全量只会刷出成堆存量问题。用户明确要求时才跑。
2. **不要动注释掉的、无人引用的代码文件**：`apps/desktop/electron/src/audioEngine.ts`、`apps/desktop/electron/src/ffmpeg-player.ts`、`packages/common/src/utils/audioParser.ts`。
3. **不擅自做技术选型，不擅自改变既有设计意图**。例如：Prettier 与 ESLint 是**融合式**（`eslint-config-prettier` + `prettier/prettier: error`），不要改成分离式；`vite.config.ts` 里 `manualChunks` 的 `node_modules/electron` **不带尾斜杠是故意的**（electron 与 electron-updater 同归 `vendor-electron`）。要改先问。
4. **保留用户的 `console.log`**。lint 只是 warn，生产由 terser 移除。
5. **不动**这些：`node_modules/`、`dist-electron/`、`dist-web/`、`release/`、`unpackage/`、`.metatune-cache/`、`.workbuddy/`、`pnpm-lock.yaml`（lock 由 pnpm 维护）。
6. **格式整理零语义改动**：不顺手重构、不改命名、不调逻辑、不顺手清存量 lint 问题。
7. `apps/mobile` 已冻结（在 `pnpm-workspace.yaml` 里被 `- "!apps/mobile"` 排除）。除非明确要求，不改它的依赖与配置；恢复开发只需删掉那一行。
8. 改了 `package.json` 不用手动排序，`postinstall` 的 `sort-package-json` 会处理。
