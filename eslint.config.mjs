/**
 * ESLint 扁平配置（Flat Config）
 *
 * 数组按顺序叠加，后面的覆盖前面的：
 *   ignores → JS/TS/Vue 规则集 → 目录级 globals → 自定义规则 → Prettier 收尾
 *
 * 与 Prettier 的分工：ESLint 管「结构约定」与「潜在错误」，同时通过
 * eslint-plugin-prettier 把格式差异也作为 ESLint 错误抛出（`eslint --fix` 即可
 * 一并修正格式）。JSON 的格式则交给 `pnpm format`（Prettier CLI）——见第 7 节注释。
 */

import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import stylisticPlugin from '@stylistic/eslint-plugin'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import jsoncPlugin from 'eslint-plugin-jsonc'

/**
 * JS 系源码范围。
 *
 * 必须显式声明：flat config 的 `files` 除限定作用范围外，还会把匹配到的文件纳入
 * ESLint 的检查集合（等价旧版 --ext）。反过来说，只给 JS 系声明 files，就能避免
 * JS 解析器误伤其它类型文件（json/css/scss/md 一旦被 JS 解析器接管会直接抛
 * Parsing error，且 --fix 修不了）。
 */
const SOURCE = ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,vue}']

export default tseslint.config(
  // ------------------------------------------------------- 1. 全局忽略
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-electron/**',
      '**/dist-web/**',
      '**/release/**',
      '**/unpackage/**', // uni-app App 端产物
      '**/.metatune-cache/**', // 运行时缓存（曲库/封面）
      'apps/mobile/src/static/**', // 静态资源原样拷贝，不适用本项目规则
      '**/*.d.ts', // 第三方类型声明
      '.workbuddy/**', // 项目记忆与日志
    ],
  },

  // --------------------------------- 2. JS / TS / Vue 基础规则集（限定 SOURCE）
  // jsonc 插件自己会接管 json，故这里把 JS 系规则集限定在 SOURCE 内。
  {
    files: SOURCE,
    ...js.configs.recommended,
  },
  ...tseslint.configs.recommended.map(config => ({ ...config, files: SOURCE })),
  ...pluginVue.configs['flat/essential'],

  // ------------------------------------- 3. .vue 的 <script> 用 TS 解析
  // Vue 解析器只负责拆块，脚本块需转交 TS 解析器才能识别类型语法。
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },

  // ------------------------------------------------------- 4. 自定义规则
  {
    files: SOURCE,
    plugins: { '@stylistic': stylisticPlugin },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      // console.log，避免在生产环境中滥用
      'no-console': 'warn',
      // 使用全等比较
      eqeqeq: 'error',
      // 允许函数在定义前声明，但不允许变量在定义前使用
      '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
      // 防止变量被意外重定义导致的阴影效应
      '@typescript-eslint/no-shadow': 'error',
      // 推荐解构赋值以简化代码（对象解构开启，数组解构关闭）
      'prefer-destructuring': ['warn', { array: false, object: true }],
      // 推荐小驼峰命名
      camelcase: ['warn', { properties: 'never', ignoreDestructuring: false, ignoreImports: false, allow: ['^_'] }],

      // Prettier 覆盖不到的排版：import 块之后留一个空行
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: ['import', 'cjs-import'], next: '*' },
        { blankLine: 'any', prev: ['import', 'cjs-import'], next: ['import', 'cjs-import'] },
      ],

      // SFC 骨架：<script> → <template> → <style>
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      // 块与块之间必须恰好空一行（多了会被压成一个，少了会自动补）。
      'vue/padding-line-between-blocks': ['error', 'always'],

      // 允许单词组件名，例如 Home.vue、About.vue
      'vue/multi-word-component-names': 'off',
      // 未使用变量只警告不报错；下划线开头的参数视为「有意忽略」
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // any 只警告，迁移期避免一刀切导致大面积报错
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // ------------------------------------------- 5. 按目录补充环境全局变量
  // tseslint 的 recommended 已自动带上 eslint-recommended（其中关闭了 no-undef，
  // 交给 TypeScript 负责），所以这里主要是显式声明意图，防止规则组合变动后误报。
  {
    // Electron 主进程、构建脚本、配置文件运行在 Node
    files: ['apps/desktop/electron/**/*.{ts,js}', '**/scripts/**/*.{js,ts,mjs,cjs}', '**/*.config.{js,ts,mjs,cjs,mts,cts}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // uni-app 各端运行时注入的全局对象，不是 import 进来的
    files: ['apps/mobile/**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        uni: 'readonly',
        wx: 'readonly',
        plus: 'readonly',
        getCurrentPages: 'readonly',
        getApp: 'readonly',
      },
    },
  },

  // ------------------------------------------------------- 6. JSON / JSONC
  // 由 jsonc 插件接管解析，比 JS 解析器安全，且能报重复键、非法数字等问题。
  ...jsoncPlugin.configs['flat/recommended-with-jsonc'],

  // ----------------------------------------------------- 7. Prettier 收尾
  // 必须最后，两步缺一不可：
  //   ① 关掉所有与 Prettier 冲突的格式化规则，否则两边会互相打架；
  //   ② 再把 Prettier 的格式差异作为 ESLint 错误抛出，配合 --fix 可直接修正。
  ...jsoncPlugin.configs['flat/prettier'],
  {
    files: SOURCE,
    plugins: { prettier: prettierPlugin },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
    },
  }
  // JSON 不在上面：本项目 6 个 tsconfig.json 是带注释的 JSONC，Prettier 的 json
  // 解析器与 jsonc 插件对注释/尾逗号的处理不一致，容易误报。JSON 的格式统一走
  // `pnpm format`（Prettier CLI），ESLint 里由 jsonc 插件只管结构（重复键等）。
)
