import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import electron from 'vite-plugin-electron/simple'
import { resolve } from 'path'
//  "files": [
//             "dist-web/**/*",
//             "dist-electron/**/*",
//             "package.json",
//             "!**/node_modules/*/{CHANGELOG.md,README.md,readme.md,*.md}",
//             "!**/node_modules/*/{test,__tests__,tests,spec,powered-test,example,examples}",
//             "!**/node_modules/*.d.ts",
//             "!**/node_modules/.bin",
//             "!**/node_modules/*/{.tsbuildinfo,*.map}",
//             "!**/*.d.ts",
//             "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
//             "!.editorconfig",
//             "!**/._*",
//             "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
//             "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
//             "!**/{appveyor.yml,.travis.yml,circle.yml}",
//             "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}",
//             "!**/node_modules/debug/**",
//             "!**/node_modules/vite/**",
//             "!**/node_modules/typescript/**",
//             "!**/node_modules/@types/**",
//             "!**/node_modules/eslint/**",
//             "!**/node_modules/prettier/**",
//             "!**/node_modules/@vitejs/**",
//             "!**/node_modules/**/*"
//         ],
// electron搭配vite如何配置vite.config.ts以及package.json里的启动和构建命令
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    electron({
      main: {
        entry: 'electron/src/main.ts',
        vite: {
          resolve: {
            alias: {
              '@metatune/common': resolve(__dirname, '../../packages/common/src'),
            },
          },
          worker: {
            rollupOptions: {
              external: ['electron'], // 不打包 electron
            },
          },
          build: {
            emptyOutDir: true,
            commonjsOptions: { transformMixedEsModules: true }, // 防止将 common 中的纯 TS 误当作外部依赖
            minify: 'terser',
            terserOptions: {
              compress: {
                drop_debugger: true, // 移除 debugger
                pure_funcs: ['console.log', 'console.info'], // 将 console.log / console.info 视为纯函数，无副作用时直接删除调用
                passes: 2, // 多轮压缩，提升无用代码清理率
              },
              format: {
                comments: false, // 移除所有注释（含版权注释）
              },
              mangle: {
                toplevel: true, // 混淆顶层变量名（进一步减小体积）
              },
            },
            sourcemap: false,
            rollupOptions: {
              output: {
                manualChunks: id => {
                  // 1️⃣ 排除 node_modules 外的文件
                  if (!id.includes('node_modules')) return

                  // 2️⃣ 按包名分组（支持子路径匹配）
                  if (id.includes('node_modules/electron')) return 'vendor-electron'
                  if (id.includes('node_modules/music-metadata')) return 'vendor-audio'
                  if (id.includes('node_modules/lodash')) return 'vendor-utils'
                  if (id.includes('node_modules/js-md5')) return 'vendor-utils'

                  // 3️⃣ 其他第三方库归为 vendor-default
                  return 'vendor-default'
                },
              },
            },
          },
        },
      },
      preload: {
        input: 'electron/src/preload.ts',
        vite: {
          build: {
            // emptyOutDir: true,
            // outDir: 'electron/dist',
            // rollupOptions: {
            //     output: {
            //         // 强制输出 .mjs，匹配 package.json 的 "type": "module"
            //         entryFileNames: '[name].mjs'
            //     }
            // }
          },
        },
      },
    }),
  ],
  base: './',
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    // 1️⃣ 切换为 terser 压缩器（默认 esbuild 无法彻底移除 console）
    minify: 'terser',
    // 2️ terser 精细控制
    terserOptions: {
      compress: {
        drop_debugger: true, // 移除 debugger
        pure_funcs: ['console.log', 'console.info'], // 将 console.log / console.info 视为纯函数，无副作用时直接删除调用
        passes: 2, // 多轮压缩，提升无用代码清理率
      },
      format: {
        comments: false, // 移除所有注释（含版权注释）
      },
      mangle: {
        toplevel: true, // 混淆顶层变量名（进一步减小体积）
      },
    },
    // 3️⃣ 生产环境关闭 sourcemap（减小 50%+ 体积）
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: id => {
          // 1️⃣ 排除 node_modules 外的文件
          if (!id.includes('node_modules')) return

          // 2️⃣ 按包名分组（支持子路径匹配）
          if (id.includes('node_modules/vue')) return 'vendor-vue'
          if (id.includes('node_modules/vue-router')) return 'vendor-vue'
          if (id.includes('node_modules/pinia')) return 'vendor-vue'
          if (id.includes('node_modules/howler')) return 'vendor-audio'
          if (id.includes('node_modules/music-metadata')) return 'vendor-audio'
          if (id.includes('node_modules/lodash')) return 'vendor-utils'
          if (id.includes('node_modules/js-md5')) return 'vendor-utils'
          if (id.includes('node_modules/dayjs')) return 'vendor-utils'

          // 3️⃣ 其他第三方库归为 vendor-default
          return 'vendor-default'
        },
      },
    },
  },
  // 优化依赖
  optimizeDeps: {
    include: ['vue', 'pinia', 'vue-router'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@metatune/common': resolve(__dirname, '../../packages/common/src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
})
