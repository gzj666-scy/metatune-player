// import { Audify, Device, ShareMode, Format, DataCallbackResult } from 'audify'
// import { FFmpeg } from '@ffmpeg/ffmpeg'
// import { fetchFile } from '@ffmpeg/util'
// import fs from 'fs/promises'
// import path from 'path'
// import { BrowserWindow } from 'electron'

// interface AudioState {
//     isPlaying: boolean
//     progress: number
//     duration: number
//     sampleRate: number
//     channels: number
// }

// let ffmpeg: FFmpeg | null = null
// let audify: Audify | null = null
// let device: Device | null = null
// let state: AudioState = { isPlaying: false, progress: 0, duration: 0, sampleRate: 44100, channels: 2 }
// let progressTimer: NodeJS.Timeout | null = null
// let pcmStream: any = null

// // 初始化 FFmpeg 实例
// async function getFFmpeg(): Promise<FFmpeg> {
//     if (!ffmpeg) {
//         ffmpeg = new FFmpeg()
//         await ffmpeg.load()
//     }
//     return ffmpeg
// }

// // 初始化 audify 播放设备（支持独占模式）
// function initAudify(exclusive: boolean = false): Device {
//     if (!audify) audify = new Audify()
//     if (device) { try { device.stop(); device.close() } catch { } }

//     const config = {
//         format: Format.F32,
//         channels: state.channels,
//         sampleRate: state.sampleRate,
//         shareMode: exclusive ? ShareMode.Exclusive : ShareMode.Shared
//     }
//     device = audify!.getDefaultPlaybackDevice().open(config)
//     device.start()
//     return device
// }

// // 核心：解码 + 播放
// export async function playFile(filePath: string, exclusive: boolean = false): Promise<void> {
//     const ffmpegInstance = await getFFmpeg()
//     const fileData = await fs.readFile(filePath)
//     const fileName = path.basename(filePath)
//     const ext = path.extname(filePath).slice(1).toLowerCase()

//     // 1. 写入临时文件供 FFmpeg 读取
//     const tempInput = path.join(require('os').tmpdir(), `metatune_${Date.now()}.${ext}`)
//     await fs.writeFile(tempInput, Buffer.from(fileData))

//     // 2. 解码为 PCM (F32, 双声道, 44100Hz 重采样保证兼容性)
//     const pcmData = await ffmpegInstance.run([
//         '-i', tempInput,
//         '-f', 'f32le',
//         '-acodec', 'pcm_f32le',
//         '-ar', '44100',
//         '-ac', '2',
//         'pipe:1'
//     ])

//     // 清理临时文件
//     fs.unlink(tempInput).catch(() => { })

//     // 3. 获取时长 (秒)
//     const probe = await ffmpegInstance.probe(tempInput)
//     state.duration = Number(probe.format?.duration || 0)
//     state.sampleRate = 44100
//     state.channels = 2
//     state.progress = 0

//     // 4. 初始化播放设备并推送 PCM
//     const dev = initAudify(exclusive)
//     const pcmBuffer = Buffer.from(pcmData)
//     const floatArray = new Float32Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.byteLength / 4)

//     // 分块播放防止阻塞主线程
//     const CHUNK_SIZE = 8192
//     let offset = 0
//     state.isPlaying = true

//     function pushChunk() {
//         if (!state.isPlaying || offset >= floatArray.length) {
//             state.isPlaying = false
//             dev.stop()
//             notifyRenderer()
//             return
//         }
//         const chunk = floatArray.slice(offset, offset + CHUNK_SIZE)
//         dev.write(chunk)
//         offset += CHUNK_SIZE
//         pushChunk() // 实际项目应改为 requestAnimationFrame 或 setImmediate 防阻塞
//     }
//     pushChunk()
//     startProgressTimer()
//     notifyRenderer()
// }

// function startProgressTimer() {
//     if (progressTimer) clearInterval(progressTimer)
//     progressTimer = setInterval(() => {
//         if (state.isPlaying && state.duration > 0) {
//             state.progress += 0.25
//             if (state.progress >= state.duration) state.progress = state.duration
//             notifyRenderer()
//         }
//     }, 250)
// }

// function notifyRenderer() {
//     BrowserWindow.getAllWindows().forEach(win => {
//         win.webContents.send('audio:state', { ...state })
//     })
// }

// export function togglePlayback() {
//     state.isPlaying = !state.isPlaying
//     notifyRenderer()
// }

// export function seekTo(seconds: number) {
//     state.progress = Math.max(0, Math.min(seconds, state.duration))
//     notifyRenderer()
// }

// export function destroy() {
//     if (progressTimer) clearInterval(progressTimer)
//     if (device) { try { device.stop(); device.close() } catch { } }
// }