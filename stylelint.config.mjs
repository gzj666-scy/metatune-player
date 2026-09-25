/**
 * 全仓 stylelint 配置
 *
 * 规则基线：stylelint-config-standard（官方 CSS 规范）
 *
 * 语法解析（本配置最关键的一点）：stylelint 默认只用 CSS 解析器，读不懂 SCSS，
 * 更读不懂 .vue。本项目 31 个 style 块里 30 个是 lang="scss"，必须显式指定解析器：
 *   - .vue  → postcss-html（自动识别 <style lang="scss">）
 *   - .scss → postcss-scss
 * 缺这两项不是"少报几条"，而是直接抛 CssSyntaxError。
 *
 * 与 Prettier 的关系：stylelint 16 已移除全部格式化类规则（indentation、string-quotes
 * 等），现存规则里只有 color-hex-length、length-zero-no-unit 与排版沾边，而 Prettier
 * 都不改动这两项，因此不需要 stylelint-config-prettier（该包随 stylelint 16 已废弃）。
 */

export default {
  extends: ['stylelint-config-standard', 'stylelint-config-standard-vue/scss'],

  overrides: [
    // 独立 .scss 文件；.vue 内的 <style lang="scss"> 由上面的 vue 配置接管
    { files: ['**/*.scss'], extends: ['stylelint-config-standard-scss'] },
  ],

  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/dist-electron/**',
    '**/dist-web/**',
    '**/release/**',
    '**/unpackage/**', // uni-app App 端产物
    '**/.metatune-cache/**', // 运行时缓存（33MB，含封面图）
    'apps/mobile/src/static/**',
    '.workbuddy/**', // 项目记忆与日志
  ],

  // stylelint 16 要求根配置带上 rules 字段；这里只放项目级覆盖。
  rules: {
    // 现有样式里有 112 处 rgba(r,g,b,a)、218 处 6 位 hex，而 standard 要求 modern
    // 写法（rgb(r g b / 40%)、能缩写的缩写）。首次启用会有较多报错，且 --fix 会
    // 改动这些文件。若想先只拦真问题、暂不做风格改造，把下面三行取消注释：
    // 'color-function-notation': null,
    // 'alpha-value-notation': null,
    // 'color-hex-length': null,
  },
}
