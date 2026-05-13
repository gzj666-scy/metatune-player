// // ffmpeg-player.js
// // const { spawn } = require('child_process');
// // const Speaker = require('speaker');
// // const fs = require('fs');
// // const path = require('path');
// // const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');
// // const mm = require('music-metadata');
// // const os = require('os');
// import { ChildProcessByStdio, spawn } from 'child_process'
// import Speaker from 'speaker'
// import fs from 'fs'
// // import path from 'path'
// import { FFmpeg } from '@ffmpeg/ffmpeg'
// // import { fetchFile } from '@ffmpeg/util'
// import { Readable } from 'stream'

// export class FFmpegSpeakerPlayer {
//     constructor() {
//         // this.currentProcess = null;
//         // this.speaker = null;
//         // this.isPlaying = false;
//         // this.isPaused = false;
//         // this.volume = 0.8;
//         // this.currentTime = 0;
//         // this.duration = 0;
//         // this.audioInfo = null;
//         // this.playbackRate = 1.0;
//         // this.volumeNode = null;
//         // this.tempFile = null;

//         // FFmpeg 实例
//         // this.ffmpeg = null;
//         this.initFFmpeg();

//         // 音频信息缓存
//         // this.audioInfoCache = new Map();
//     }

//     private currentProcess: ChildProcessByStdio<null, Readable, Readable> | null = null
//     private speaker: Speaker | null = null
//     private isPlaying = false
//     private isPaused = false
//     private volume = 0.8
//     private currentTime = 0
//     private duration = 0
//     private audioInfo: ISong | null = null
//     private playbackRate = 1.0
//     // private volumeNode: any
//     private tempFile: any
//     private ffmpeg: FFmpeg | null = null
//     private audioInfoCache = new Map()
//     // 播放进度跟踪
//     private playbackStartTime = 0;
//     private playbackStartOffset = 0;
//     private timeTrackingInterval: NodeJS.Timeout | null = null

//     private async initFFmpeg() {
//         try {
//             this.ffmpeg = new FFmpeg()
//             // this.ffmpeg = FFmpeg.createFFmpeg({
//             //     log: true,
//             //     corePath: require.resolve('@ffmpeg/core'),
//             // });
//             await this.ffmpeg.load();
//             console.log('FFmpeg 加载成功');
//         } catch (error) {
//             console.error('FFmpeg 加载失败:', error);
//             throw error;
//         }
//     }

//     // 获取音频信息
//     // async getAudioInfo(filePath: string) {
//     //     if (this.audioInfoCache.has(filePath)) {
//     //         return this.audioInfoCache.get(filePath);
//     //     }

//     //     try {
//     //         const metadata = await mm.parseFile(filePath);

//     //         const info = {
//     //             duration: metadata.format.duration,
//     //             bitDepth: metadata.format.bitsPerSample,
//     //             sampleRate: metadata.format.sampleRate,
//     //             channels: metadata.format.numberOfChannels,
//     //             codec: metadata.format.codec,
//     //             bitrate: metadata.format.bitrate,
//     //             format: metadata.format.container,
//     //             tags: metadata.common
//     //         };

//     //         this.audioInfoCache.set(filePath, info);
//     //         return info;
//     //     } catch (error) {
//     //         console.error('获取音频信息失败:', error);
//     //         return null;
//     //     }
//     // }

//     // 播放本地文件
//     public async playLocalFile(song: ISong, options = {}) {
//         try {
//             // 停止当前播放
//             this.stop();

//             // 获取音频信息
//             this.audioInfo = song
//             // this.audioInfo = await this.getAudioInfo(filePath);
//             // if (!this.audioInfo) {
//             //     throw new Error('无法获取音频信息');
//             // }

//             this.duration = this.audioInfo.duration;

//             // 开始播放
//             this.playAudioStream(this.audioInfo.filePath, options);
//             this.isPlaying = true;
//             this.isPaused = false;

//             return this.audioInfo;
//         } catch (error) {
//             console.error('播放失败:', error);
//             throw error;
//         }
//     }

//     // 播放在线音频
//     // async playOnlineAudio(url, options = {}) {
//     //     try {
//     //         // 创建临时文件
//     //         const tempDir = os.tmpdir();
//     //         const tempPath = path.join(tempDir, `audio_${Date.now()}.tmp`);

//     //         // 下载音频文件
//     //         await this.downloadAudio(url, tempPath);
//     //         this.tempFile = tempPath;

//     //         // 播放临时文件
//     //         return await this.playLocalFile(tempPath, options);
//     //     } catch (error) {
//     //         console.error('播放在线音频失败:', error);
//     //         throw error;
//     //     }
//     // }

//     // 下载音频
//     // async downloadAudio(url, outputPath) {
//     //     return new Promise((resolve, reject) => {
//     //         const { spawn } = require('child_process');

//     //         // 使用 ffmpeg 下载并转换
//     //         const ffmpeg = spawn('ffmpeg', [
//     //             '-i', url,
//     //             '-c', 'copy',
//     //             '-y', // 覆盖输出文件
//     //             outputPath
//     //         ]);

//     //         ffmpeg.stderr.on('data', (data) => {
//     //             // 可以在这里处理进度信息
//     //             console.log('下载进度:', data.toString());
//     //         });

//     //         ffmpeg.on('close', (code) => {
//     //             if (code === 0) {
//     //                 resolve();
//     //             } else {
//     //                 reject(new Error(`下载失败，退出码: ${code}`));
//     //             }
//     //         });

//     //         ffmpeg.on('error', reject);
//     //     });
//     // }

//     // 播放音频流
//     private playAudioStream(filePath: string, options: any) {
//         const ffmpegArgs = this.buildFFmpegArgs(filePath, options);

//         // 启动 ffmpeg 进程
//         this.currentProcess = spawn('ffmpeg', ffmpegArgs, {
//             stdio: ['ignore', 'pipe', 'pipe']
//         });

//         // 记录播放开始时间和偏移
//         this.playbackStartTime = Date.now();
//         this.playbackStartOffset = options.startTime || 0;

//         // 创建 Speaker 实例
//         this.speaker = new Speaker({
//             // channels: this.audioInfo!.channels || 2,
//             channels: 2,
//             bitDepth: this.audioInfo!.bitsPerSample || 16,
//             sampleRate: this.audioInfo!.sampleRate || 44100,
//             // signed: true
//         });

//         // 处理错误
//         this.currentProcess.stderr.on('data', (data) => {
//             console.error('FFmpeg 错误:', data.toString());
//         });

//         this.speaker.on('error', (err) => {
//             console.error('Speaker 错误:', err);
//             this.stop();
//         });

//         // 连接管道
//         this.currentProcess.stdout.pipe(this.speaker);

//         // 监听结束
//         this.currentProcess.on('close', (code) => {
//             if (code === 0) {
//                 console.log('播放完成');
//             } else {
//                 console.error('FFmpeg 异常退出:', code);
//             }
//             this.isPlaying = false;
//             this.cleanupTempFile();
//         });

//         // 开始播放进度跟踪
//         this.startTimeTracking();
//     }

//     // 构建 FFmpeg 参数
//     private buildFFmpegArgs(filePath: string, options: any = {}) {
//         const args: string[] = [];

//         // 如果指定了开始时间，添加跳转参数
//         if (options.startTime && options.startTime > 0) {
//             args.push('-ss', options.startTime.toString());
//         }

//         // 输入文件
//         args.push('-i', filePath);

//         // 音频处理参数
//         args.push(
//             '-vn',           // 忽略视频
//             '-sn',           // 忽略字幕
//             '-dn',           // 忽略数据流
//             '-loglevel', 'error' // 减少日志输出
//         );

//         // 音质优化参数
//         args.push(
//             '-acodec', 'pcm_s16le', // 16位PCM
//             '-ar', '44100',         // 采样率
//             '-ac', '2',             // 立体声
//             '-f', 's16le',          // 输出格式
//             '-'
//         );

//         // 应用音量
//         if (this.volume !== 1.0) {
//             args.splice(2, 0, '-af', `volume=${this.volume}`);
//         }

//         // 应用播放速度
//         if (this.playbackRate !== 1.0) {
//             args.splice(2, 0, '-af', `atempo=${this.playbackRate}`);
//         }

//         return args;
//     }

//     // 暂停播放
//     public pause() {
//         if (this.isPlaying && !this.isPaused) {
//             console.log('暂停播放');

//             // 暂停 ffmpeg 进程
//             if (this.currentProcess) {
//                 this.currentProcess.kill('SIGSTOP');
//             }

//             // 暂停 Speaker
//             if (this.speaker) {
//                 this.speaker.end();
//                 this.speaker = null;
//             }

//             this.isPaused = true;
//             this.stopTimeTracking();
//         }
//     }

//     // 恢复播放
//     public resume() {
//         if (this.isPlaying && this.isPaused) {
//             console.log('恢复播放');

//             // 恢复 ffmpeg 进程
//             if (this.currentProcess) {
//                 // 重新创建 Speaker
//                 this.speaker = new Speaker({
//                     // channels: this.audioInfo!.channels || 2,
//                     channels: 2,
//                     bitDepth: this.audioInfo!.bitsPerSample || 16,
//                     sampleRate: this.audioInfo!.sampleRate || 44100,
//                     // signed: true
//                 });

//                 this.currentProcess.kill('SIGCONT');

//                 // 重新连接管道
//                 this.currentProcess.stdout.pipe(this.speaker);
//             }

//             this.isPaused = false;
//             this.playbackStartTime = Date.now();
//             this.playbackStartOffset = this.currentTime;
//             this.startTimeTracking();
//         }
//     }

//     // 停止播放
//     public stop() {
//         console.log('停止播放');

//         if (this.currentProcess) {
//             this.currentProcess.kill('SIGTERM');
//             this.currentProcess = null;
//         }

//         if (this.speaker) {
//             this.speaker.end();
//             this.speaker = null;
//         }

//         this.isPlaying = false;
//         this.isPaused = false;
//         this.currentTime = 0;
//         this.stopTimeTracking();
//         this.cleanupTempFile();
//     }

//     // 跳转到指定时间
//     public seek(time: number) {
//         if (this.isPlaying && this.audioInfo) {
//             const newTime = Math.max(0, Math.min(time, this.duration));
//             console.log(`跳转到: ${newTime}秒`);

//             // 停止当前播放
//             this.stop();

//             // 从新位置开始播放
//             this.currentTime = newTime;
//             this.playAudioStream(this.audioInfo.filePath, { startTime: newTime });
//         }
//     }

//     // 设置音量
//     public setVolume(level: number) {
//         this.volume = Math.max(0, Math.min(1, level));
//         console.log(`设置音量: ${this.volume}`);

//         if (this.isPlaying && !this.isPaused) {
//             // 需要重新启动播放以应用新音量
//             this.seek(this.currentTime);
//         }
//     }

//     // 设置播放速度
//     public setPlaybackRate(rate: number) {
//         this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
//         console.log(`设置播放速度: ${this.playbackRate}`);

//         if (this.isPlaying && !this.isPaused) {
//             this.seek(this.currentTime);
//         }
//     }

//     // 时间跟踪
//     private startTimeTracking() {
//         this.stopTimeTracking();

//         this.timeTrackingInterval = setInterval(() => {
//             if (this.isPlaying && !this.isPaused) {
//                 // this.currentTime += 0.1; // 每100ms更新一次

//                 // 计算当前播放时间
//                 const elapsedSeconds = (Date.now() - this.playbackStartTime) / 1000;
//                 this.currentTime = this.playbackStartOffset + elapsedSeconds;

//                 // 检查是否播放完成
//                 if (this.currentTime >= this.duration) {
//                     this.stop();
//                 }
//             }
//         }, 100);
//     }

//     private stopTimeTracking() {
//         if (this.timeTrackingInterval) {
//             clearInterval(this.timeTrackingInterval);
//             this.timeTrackingInterval = null;
//         }
//     }

//     // 清理临时文件
//     private cleanupTempFile() {
//         if (this.tempFile && fs.existsSync(this.tempFile)) {
//             try {
//                 fs.unlinkSync(this.tempFile);
//                 this.tempFile = null;
//             } catch (error) {
//                 console.error('删除临时文件失败:', error);
//             }
//         }
//     }

//     // 获取支持的格式
//     // getSupportedFormats() {
//     //     return [
//     //         'mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wma',
//     //         'opus', 'webm', 'aiff', 'alac', 'ape', 'tta',
//     //         'wv', 'mka', 'mpc', 'ofr', 'spx', 'tak'
//     //     ];
//     // }

//     // 清理资源
//     public destroy() {
//         console.log('清理播放器资源');

//         this.stop();
//         this.audioInfoCache.clear();

//         if (this.ffmpeg) {
//             // 使用 terminate() 而不是 exit()
//             this.ffmpeg.terminate();
//         }
//     }
// }
// // export default FFmpegSpeakerPlayer;
// // module.exports = FFmpegSpeakerPlayer;
