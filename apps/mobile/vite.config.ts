import { defineConfig, type PluginOption } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import { resolve } from 'path';

const uniPlugin = ((uni as { default?: unknown }).default ?? uni) as () => PluginOption | PluginOption[];

export default defineConfig({
    plugins: [uniPlugin()],
    base: './',
    build: {
        target: 'es2015',
        cssTarget: 'chrome61'
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@metatune/common': resolve(__dirname, '../../packages/common/src'),
            // jsmediatags 无标准 exports，uni/vite 解析包入口会失败，固定到真实入口文件
            // 'jsmediatags': resolve(__dirname, '../../node_modules/jsmediatags/build2/jsmediatags.js'),
            '@static': resolve(__dirname, 'src/static')
        }
    },
    server: {
        port: 3001,
        host: '0.0.0.0'
    }
});