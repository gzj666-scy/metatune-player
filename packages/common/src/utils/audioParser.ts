// // 使用 jsmediatags 库解析音频文件元数据
// import jsmediatags from 'jsmediatags';
// import type { TagType } from 'jsmediatags/types';

// export interface ParsedAudioMetadata {
//     title: string;
//     artist: string;
//     album: string;
//     duration: number;
//     picture?: {
//         format: string;
//         data: Uint8Array;
//     };
//     lyrics?: string;
//     // 技术信息
//     bitrate?: number;
//     sampleRate?: number;
//     bitsPerSample?: number;
// }

// /** 音频元数据解析器 */
// export class AudioMetadataParser {
//     /**
//      * 解析音频文件
//      * @param file 音频文件
//      */
//     static async parseFile(file: File | Blob): Promise<ParsedAudioMetadata> {
//         return new Promise((resolve, reject) => {
//             new jsmediatags.Reader(file as Blob)
//                 .read({
//                     onSuccess: (tag: TagType) => {
//                         const tags = tag.tags;
//                         const result: ParsedAudioMetadata = {
//                             title: tags.title || file.name.replace(/\.[^/.]+$/, ""), // 默认使用文件名
//                             artist: tags.artist || 'Unknown Artist',
//                             album: tags.album || 'Unknown Album',
//                             duration: 0, // 需要额外API获取时长
//                             // 处理封面图片
//                             picture: tags.picture ? {
//                                 format: tags.picture.format,
//                                 data: new Uint8Array(tags.picture.data)
//                             } : undefined,
//                             lyrics: tags.lyrics ? tags.lyrics.value : tags.unsynchronisedLyrics?.lyrics,
//                             bitrate: tags.bitrate,
//                             sampleRate: tags.samplingFrequency,
//                             bitsPerSample: tags.bitsPerSample
//                         };
//                         resolve(result);
//                     },
//                     onError: (error) => {
//                         console.error('Parse audio metadata failed:', error);
//                         // 解析失败时返回基础信息
//                         resolve({
//                             title: file.name.replace(/\.[^/.]+$/, ""),
//                             artist: 'Unknown Artist',
//                             album: 'Unknown Album',
//                             duration: 0
//                         });
//                     }
//                 });
//         });
//     }

//     /**
//      * 获取音频时长 (Web API)
//      * @param file 音频文件
//      */
//     static async getAudioDuration(file: Blob): Promise<number> {
//         return new Promise((resolve, reject) => {
//             const audio = new Audio();
//             audio.preload = 'metadata';
//             audio.onloadedmetadata = () => {
//                 window.URL.revokeObjectURL(audio.src);
//                 resolve(audio.duration);
//             };
//             audio.onerror = () => {
//                 window.URL.revokeObjectURL(audio.src);
//                 resolve(0);
//             };
//             audio.src = URL.createObjectURL(file);
//         });
//     }

//     // 根据技术参数判定音质标识
//     static getQualityFlag(metadata: ParsedAudioMetadata): 'HQ' | 'SQ' | 'HR' | 'LQ' {
//         const { bitrate, sampleRate, bitsPerSample } = metadata;
//         // 高解析度 (Hi-Res) 标准: 通常采样率 > 48kHz 且位深 >= 24bit
//         if (sampleRate && sampleRate > 48000 && bitsPerSample && bitsPerSample >= 24) {
//             return 'HR';
//         }
//         // 无损 (SQ): 通常指FLAC, ALAC, WAV等无损格式，这里用高码率近似判断
//         if (bitrate && bitrate >= 900) {
//             return 'SQ';
//         }
//         // 高品质 (HQ): 中等码率
//         if (bitrate && bitrate >= 192) {
//             return 'HQ';
//         }
//         // 低品质
//         return 'LQ';
//     }
// }