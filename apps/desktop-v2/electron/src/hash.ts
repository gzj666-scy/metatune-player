import { createHash } from 'crypto'
import { open } from 'fs/promises'

/** 头/尾各采样 256KB */
const SAMPLE_SIZE = 256 * 1024

/**
 * 计算文件 uid：只取「文件大小 + 头部 256KB + 尾部 256KB」做 blake2b。
 *
 * 相比原实现的全量 MD5（readFile 整文件 + js-md5 纯 JS 计算）：
 * - IO 从「整文件」降到 512KB，一首 200MB 的 FLAC 不再被整体读进内存
 * - 哈希交给 OpenSSL 原生实现，比 js-md5 快一个量级
 *
 * 唯一性：size 不同必然不同；size 相同时头尾 512KB 内容一致的概率可忽略
 * （音频容器的头尾必然携带编码器/元数据差异）。改名、移动文件不影响 uid。
 */
export async function fastFileUid(filePath: string, size: number): Promise<string> {
  const hash = createHash('blake2b512', { outputLength: 32 })
  hash.update(String(size))

  if (size <= 0) return hash.digest('hex')

  const handle = await open(filePath, 'r')
  try {
    const buf = Buffer.allocUnsafe(SAMPLE_SIZE)

    const head = await handle.read(buf, 0, Math.min(SAMPLE_SIZE, size), 0)
    hash.update(buf.subarray(0, head.bytesRead))

    // 尾部只在与头部不重叠时才有额外信息量
    if (size > SAMPLE_SIZE) {
      const tailLen = Math.min(SAMPLE_SIZE, size - SAMPLE_SIZE)
      const tail = await handle.read(buf, 0, tailLen, size - tailLen)
      hash.update(buf.subarray(0, tail.bytesRead))
    }
  } finally {
    await handle.close()
  }

  return hash.digest('hex')
}

/** 给封面图等小体积二进制算摘要，用于缓存文件名 */
export function hashBuffer(data: Uint8Array | ArrayBuffer): string {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data)
  return createHash('blake2b512', { outputLength: 16 }).update(view).digest('hex')
}
