// import { Howl, Howler } from 'howler';
// import type { ISong } from '@metatune/common';
// // 你好，请基于分别基于howler和@ffmpeg/ffmpeg + speaker 两种方案实现完整的 Electron 高音质播放器示例，要求音质最大化，要支持常见的各种音频格式，能控制播放、暂停、音量调节、播放进度，同时音频的播放进度也能同步显示。还要适当考虑性能及内存占用。
// // 需要注意的是：
// // 1、howler是基于浏览器实现的，不能直接播放本地文件，要如何解决并兼顾上述需求（排除你上面说的Blob URL、Data URL方案），重点提醒，howler配置不能启用 html5: true, 因为你也说了HTML5 Audio音质上最差，与音质最大化要求相悖；
// // 2、如果是@ffmpeg/ffmpeg + speaker这套方案，除支持播放本地音频外能否播放在线路径的音频，同时兼顾上述需求
// export class DesktopAudioPlayer {
//     private howl: Howl | null = null;
//     private currentSong: ISong | null = null;
//     private onTimeUpdateCallbacks: ((currentTime: number) => void)[] = [];
//     private onEndCallbacks: (() => void)[] = [];
//     private onPlayCallbacks: (() => void)[] = [];
//     private onPauseCallbacks: (() => void)[] = [];
//     private onLoadCallbacks: (() => void)[] = [];
//     private onErrorCallbacks: ((error: any) => void)[] = [];

//     private intervalId: number | null = null;
//     private isSeeking = false;

//     constructor() {
//         // 初始化Howler全局配置
//         Howler.autoUnlock = true;
//         Howler.html5PoolSize = 10;
//     }

//     // 播放歌曲
//     play(song: ISong, startTime: number = 0) {
//         this.stop();

//         this.currentSong = song;

//         // 创建Howl实例
//         this.howl = new Howl({
//             src: [song.filePath],
//             html5: false,
//             // html5: true, // 使用HTML5 Audio API以获得更好的格式支持
//             // format: this.getFormatFromFilePath(song.filePath),
//             autoplay: false,
//             preload: true,
//             volume: 1.0,
//             onload: () => {
//                 if (startTime > 0 && this.howl) {
//                     this.howl.seek(startTime);
//                 }
//                 this.howl?.play();
//                 this.onLoadCallbacks.forEach(callback => callback());
//                 this.startTimeUpdateInterval();
//             },
//             onplay: () => {
//                 this.onPlayCallbacks.forEach(callback => callback());
//             },
//             onpause: () => {
//                 this.onPauseCallbacks.forEach(callback => callback());
//             },
//             onend: () => {
//                 this.onEndCallbacks.forEach(callback => callback());
//                 this.stopTimeUpdateInterval();
//             },
//             onstop: () => {
//                 this.stopTimeUpdateInterval();
//             },
//             onseek: () => {
//                 this.isSeeking = false;
//             },
//             onloaderror: (id, error) => {
//                 console.error('Load error:', error);
//                 this.onErrorCallbacks.forEach(callback => callback(error));
//             },
//             onplayerror: (id, error) => {
//                 console.error('Play error:', error);
//                 this.onErrorCallbacks.forEach(callback => callback(error));
//             }
//         });
//     }

//     // 暂停
//     pause() {
//         if (this.howl && this.howl.playing()) {
//             this.howl.pause();
//         }
//     }

//     // 恢复播放
//     resume() {
//         if (this.howl && !this.howl.playing()) {
//             this.howl.play();
//         }
//     }

//     // 停止
//     stop() {
//         if (this.howl) {
//             this.howl.stop();
//             this.howl.unload();
//             this.howl = null;
//         }
//         this.stopTimeUpdateInterval();
//         this.currentSong = null;
//     }

//     // 跳转到指定时间
//     seek(time: number) {
//         if (this.howl && this.howl.playing()) {
//             this.isSeeking = true;
//             this.howl.seek(time);
//         }
//     }

//     // 设置音量
//     setVolume(volume: number) {
//         if (this.howl) {
//             this.howl.volume(volume);
//         }
//         Howler.volume(volume);
//     }

//     // 获取当前时间
//     getCurrentTime(): number {
//         if (this.howl) {
//             return this.howl.seek() as number;
//         }
//         return 0;
//     }

//     // 获取总时长
//     getDuration(): number {
//         if (this.howl) {
//             return this.howl.duration();
//         }
//         return 0;
//     }

//     // 是否正在播放
//     isPlaying(): boolean {
//         return this.howl ? this.howl.playing() : false;
//     }

//     // 获取当前歌曲
//     getCurrentSong(): ISong | null {
//         return this.currentSong;
//     }

//     // 事件监听
//     onTimeUpdate(callback: (currentTime: number) => void) {
//         this.onTimeUpdateCallbacks.push(callback);
//     }

//     onEnd(callback: () => void) {
//         this.onEndCallbacks.push(callback);
//     }

//     onPlay(callback: () => void) {
//         this.onPlayCallbacks.push(callback);
//     }

//     onPause(callback: () => void) {
//         this.onPauseCallbacks.push(callback);
//     }

//     onLoad(callback: () => void) {
//         this.onLoadCallbacks.push(callback);
//     }

//     onError(callback: (error: any) => void) {
//         this.onErrorCallbacks.push(callback);
//     }

//     // 移除事件监听
//     offTimeUpdate(callback: (currentTime: number) => void) {
//         const index = this.onTimeUpdateCallbacks.indexOf(callback);
//         if (index > -1) {
//             this.onTimeUpdateCallbacks.splice(index, 1);
//         }
//     }

//     // 清理所有监听
//     destroy() {
//         this.stop();
//         this.onTimeUpdateCallbacks = [];
//         this.onEndCallbacks = [];
//         this.onPlayCallbacks = [];
//         this.onPauseCallbacks = [];
//         this.onLoadCallbacks = [];
//         this.onErrorCallbacks = [];
//     }

//     // 私有方法
//     private startTimeUpdateInterval() {
//         this.stopTimeUpdateInterval();
//         this.intervalId = window.setInterval(() => {
//             if (this.howl && this.howl.playing() && !this.isSeeking) {
//                 const currentTime = this.howl.seek() as number;
//                 this.onTimeUpdateCallbacks.forEach(callback => callback(currentTime));
//             }
//         }, 100); // 每100ms更新一次
//     }

//     private stopTimeUpdateInterval() {
//         if (this.intervalId) {
//             clearInterval(this.intervalId);
//             this.intervalId = null;
//         }
//     }

//     private getFormatFromFilePath(filePath: string): string | string[] {
//         const ext = filePath.split('.').pop()?.toLowerCase();
//         const formatMap: Record<string, string> = {
//             'mp3': 'mp3',
//             'aac': 'aac',
//             'm4a': 'm4a',
//             'flac': 'flac',
//             'ape': 'ape',
//             'wav': 'wav',
//             'wma': 'wma',
//             'ogg': 'ogg',
//             'opus': 'opus',
//             'webm': 'webm'
//         };
//         return formatMap[ext || ''] || 'mp3';
//     }
// }
