/**
 * @gravito/constellation - Compression utilities
 * @module utils/Compression
 * @since 3.1.0
 */

import type { Transform } from 'node:stream'
import { createGzip } from 'node:zlib'
import { getCompressionAdapter } from '@gravito/core'
import { ConstellationError } from '../errors/ConstellationError'

const sharedEncoder = new TextEncoder()

import { ConstellationErrorCodes } from '../errors/codes'

/**
 * Compression configuration.
 */
export interface CompressionConfig {
  /** Compression format. @default 'gzip' */
  format?: 'gzip' | undefined
  /** Compression level (1-9). @default 6 */
  level?: number | undefined
}

/**
 * 將 AsyncIterable<string> 壓縮為 Buffer。
 * 適用於需要完整壓縮結果的場景（如 S3 Upload）。
 *
 * 使用 RuntimeCompressionAdapter 自動選擇最佳壓縮實作：
 * - Bun: 原生 C++ 壓縮（2-5x 更快）
 * - Node.js: node:zlib fallback
 *
 * @param source - 輸入的字串串流
 * @param config - 壓縮設定
 * @returns 壓縮後的 Buffer
 *
 * @example
 * ```typescript
 * const source = (async function*() {
 *   yield '<?xml version="1.0"?>'
 *   yield '<urlset>...</urlset>'
 * })()
 * const compressed = await compressToBuffer(source)
 * ```
 */
export async function compressToBuffer(
  source: AsyncIterable<string>,
  config?: CompressionConfig
): Promise<Buffer> {
  const level = config?.level ?? 6
  if (level < 1 || level > 9) {
    throw new ConstellationError(400, ConstellationErrorCodes.INVALID_COMPRESSION_LEVEL, {
      message: `Invalid compression level: ${level}. Must be between 1 and 9.`,
    })
  }

  // 收集所有 chunk，再一次性壓縮（消除串流回調複雜度）
  const parts: string[] = []
  for await (const chunk of source) {
    parts.push(chunk)
  }

  const input = sharedEncoder.encode(parts.join(''))
  const adapter = getCompressionAdapter()
  const compressed = await adapter.gzip(input, { level })
  return Buffer.from(compressed)
}

/**
 * 回傳壓縮串流 Transform。
 * 適用於可直接 pipe 的場景（如 Disk write）。
 *
 * @param config - 壓縮設定
 * @returns Transform stream
 *
 * @example
 * ```typescript
 * const readable = Readable.from(source)
 * const gzip = createCompressionStream({ level: 9 })
 * const writeStream = createWriteStream('output.xml.gz')
 * await pipeline(readable, gzip, writeStream)
 * ```
 */
export function createCompressionStream(config?: CompressionConfig): Transform {
  const level = config?.level ?? 6
  if (level < 1 || level > 9) {
    throw new ConstellationError(400, ConstellationErrorCodes.INVALID_COMPRESSION_LEVEL, {
      message: `Invalid compression level: ${level}. Must be between 1 and 9.`,
    })
  }
  return createGzip({ level })
}

/**
 * 將檔名轉換為 gzip 格式（加上 .gz 副檔名）。
 *
 * @param filename - 原始檔名
 * @returns 帶有 .gz 副檔名的檔名
 *
 * @example
 * ```typescript
 * toGzipFilename('sitemap.xml') // 'sitemap.xml.gz'
 * toGzipFilename('sitemap.xml.gz') // 'sitemap.xml.gz' (不重複添加)
 * ```
 */
export function toGzipFilename(filename: string): string {
  return filename.endsWith('.gz') ? filename : `${filename}.gz`
}

/**
 * 移除檔名的 .gz 副檔名。
 *
 * @param filename - gzip 檔名
 * @returns 移除 .gz 後的檔名
 *
 * @example
 * ```typescript
 * fromGzipFilename('sitemap.xml.gz') // 'sitemap.xml'
 * fromGzipFilename('sitemap.xml') // 'sitemap.xml'
 * ```
 */
export function fromGzipFilename(filename: string): string {
  return filename.endsWith('.gz') ? filename.slice(0, -3) : filename
}
