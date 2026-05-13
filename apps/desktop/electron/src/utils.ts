import { extname } from "path";
import { md5 } from 'js-md5'

const mimeMap: Record<string, string> = {
    // 音频类
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.wav': 'audio/wav',
    '.ape': 'audio/x-ape',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/opus',
    '.webm': 'audio/webm',
    '.wma': 'audio/x-ms-wma',
    // 图片类
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'



    //     'audio/flac',
    // [0]   'audio/x-flac',
    // [0]   'audio/mpeg',
    // [0]   'audio/x-mpeg',
    // [0]   'audio/mp3',
    // [0]   'audio/x-mp3',
    // [0]   'audio/aacs',
    // [0]   'audio/x-aacs',
    // [0]   'audio/aacp',
    // [0]   'audio/x-aacp',
    // [0]   'audio/ape',
    // [0]   'audio/x-ape',
    // [0]   'audio/monkeys-audio',
    // [0]   'audio/x-monkeys-audio',
    // [0]   'audio/mp4',
    // [0]   'audio/x-mp4',
    // [0]   'audio/m4a',
    // [0]   'audio/x-m4a',
    // [0]   'video/m4v',
    // [0]   'video/x-m4v',
    // [0]   'video/mp4',
    // [0]   'video/x-mp4',
    // [0]   'video/quicktime',
    // [0]   'video/x-quicktime',
    // [0]   'audio/matroska',
    // [0]   'audio/x-matroska',
    // [0]   'video/matroska',
    // [0]   'video/x-matroska',
    // [0]   'audio/webm',
    // [0]   'audio/x-webm',
    // [0]   'video/webm',
    // [0]   'video/x-webm',
    // [0]   'audio/vnd.wave',
    // [0]   'audio/x-vnd.wave',
    // [0]   'audio/wav',
    // [0]   'audio/x-wav',
    // [0]   'audio/wave',
    // [0]   'audio/x-wave',
    // [0]   'audio/ogg',
    // [0]   'audio/x-ogg',
    // [0]   'audio/opus',
    // [0]   'audio/x-opus',
    // [0]   'audio/speex',
    // [0]   'audio/x-speex',
    // [0]   'video/ogg',
    // [0]   'video/x-ogg',
    // [0]   'audio/ms-wma',
    // [0]   'audio/x-ms-wma',
    // [0]   'video/ms-wmv',
    // [0]   'video/x-ms-wmv',
    // [0]   'audio/ms-asf',
    // [0]   'audio/x-ms-asf',
    // [0]   'video/ms-asf',
    // [0]   'video/x-ms-asf',
    // [0]   'application/vnd.ms-asf',
    // [0]   'application/x-vnd.ms-asf',
    // [0]   'audio/aiff',
    // [0]   'audio/x-aiff',
    // [0]   'audio/aif',
    // [0]   'audio/x-aif',
    // [0]   'audio/aifc',
    // [0]   'audio/x-aifc',
    // [0]   'application/aiff',
    // [0]   'application/x-aiff',
    // [0]   'audio/wavpack',
    // [0]   'audio/x-wavpack',
    // [0]   'audio/musepack',
    // [0]   'audio/x-musepack',
    // [0]   'audio/dsf',
    //   'audio/x-dsf',
    //   'audio/dsd',
    //    'audio/x-dsd'
};

export const getMimeType = (filePath: string, defaultExt = 'application/octet-stream'): string => {
    const ext = extname(filePath).toLowerCase();
    return mimeMap[ext] || defaultExt;
}

export const getExtname = (mimeType: string, defaultExt = ''): string => {
    let ext = defaultExt
    for (const key in mimeMap) {
        if (mimeMap[key] === mimeType) {
            ext = key
            break
        }
    }
    return ext
}

/**
 * 计算二进制数据的 MD5 值
 * ✅ 纯 JS 算法实现，不依赖 window/crypto/fs 等任何环境对象
 * ✅ 仅接收 ArrayBuffer 或 Uint8Array，确保跨端类型安全
 */
export const calculateMD5 = (data: ArrayBuffer | Uint8Array): string => {
    // js-md5 内部已处理 ArrayBuffer/Uint8Array 类型分支
    return md5(data)
}

export const uint8ArrayToBase64 = (uint8Array: Uint8Array) => {
    // 步骤1: 将 Uint8Array 转换为二进制字符串
    let binaryString = '';
    uint8Array.forEach((byte) => {
        binaryString += String.fromCharCode(byte);
    });

    // 步骤2: 使用 btoa() 将二进制字符串转换为 Base64
    let base64String = btoa(binaryString);
    return base64String;
}