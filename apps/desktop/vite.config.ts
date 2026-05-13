import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx'
import electron from 'vite-plugin-electron/simple'
import { resolve } from 'path';
// electron搭配vite如何配置vite.config.ts以及package.json里的启动和构建命令
export default defineConfig({
    plugins: [
        vue(),
        vueJsx(),
        electron({
            main: {
                entry: 'electron/src/main.ts',
                // onstart: ({ startup }) => startup(),
                vite: {
                    // base: 'electron/',
                    resolve: {
                        alias: {
                            '@metatune/common': resolve(__dirname, '../../packages/common/src')
                        }
                    },
                    worker: {
                        rollupOptions: {
                            external: ['electron'], // 不打包 electron
                        },
                    },

                    build: {
                        // outDir: 'electron/dist',
                        emptyOutDir: true,
                        commonjsOptions: { transformMixedEsModules: true }, // 防止将 common 中的纯 TS 误当作外部依赖
                    }
                }
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
                    }
                }
            }
        })
    ],
    base: './',
    build: {
        outDir: 'dist-web',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            }
        }
    },
    // 优化依赖
    optimizeDeps: {
        include: ['vue', 'pinia', 'vue-router'],
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@metatune/common': resolve(__dirname, '../../packages/common/src')
        }
    },
    server: {
        port: 3000,
        strictPort: true
    }
});