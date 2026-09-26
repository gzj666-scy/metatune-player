import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import electron from 'vite-plugin-electron/simple'
import { resolve } from 'path'

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
              '@metatune/common-v2': resolve(__dirname, '../../packages/common-v2/src'),
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
                // 只保留 /*! 开头的注释（terser 惯例），主入口的 banner 靠它活下来，见下方 output.banner
                comments: /^!/,
              },
              mangle: {
                toplevel: true, // 混淆顶层变量名（进一步减小体积）
              },
            },
            sourcemap: false,
            rollupOptions: {
              output: {
                // 主进程入口的首字节不能是 require( —— 本机 Electron 41 + Windows 下会出现
                // 启动约 130ms 后静默退出（exit 4294930435，无任何 JS 异常输出），加一句注释即稳定启动。
                // 为什么偏要注释：rollup 的 banner 会先过 terser，被压缩掉的写法（如 `void 0;`）无效。
                banner: '/*! metatune-desktop-v2 electron main */',
                manualChunks: id => {
                  // 1️⃣ 排除 node_modules 外的文件
                  if (!id.includes('node_modules')) return

                  // 2️⃣ 按包名分组（支持子路径匹配）
                  // 前缀匹配是故意的：electron 与 electron-updater 都归到 vendor-electron
                  if (id.includes('node_modules/electron')) return 'vendor-electron'
                  if (id.includes('node_modules/music-metadata')) return 'vendor-audio'
                  if (id.includes('node_modules/lodash')) return 'vendor-utils'
                  if (id.includes('node_modules/js-md5')) return 'vendor-utils'
                  if (id.includes('node_modules/node-vibrant')) return 'vendor-color'

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
          if (id.includes('node_modules/dayjs')) return 'vendor-utils'
          if (id.includes('node_modules/node-vibrant')) return 'vendor-color'

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
      '@metatune/common-v2': resolve(__dirname, '../../packages/common-v2/src'),
    },
  },
  server: {
    // 与 apps/desktop 错开端口，两个版本可同时 dev
    port: 3100,
    strictPort: true,
  },
})
