import { createReadStream, createWriteStream } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { getRuntimeAdapter, runtimeMkdir, runtimeReadText } from '@gravito/core'
import type { SitemapStorage, WriteStreamOptions } from '../types'
import { createCompressionStream, toGzipFilename } from '../utils/Compression'

function sanitizeFilename(filename: string): string {
  if (!filename) {
    throw new Error('Invalid sitemap filename.')
  }
  if (filename.includes('\0')) {
    throw new Error('Invalid sitemap filename.')
  }
  if (filename.includes('/') || filename.includes('\\')) {
    throw new Error('Invalid sitemap filename.')
  }
  if (filename.includes('..')) {
    throw new Error('Invalid sitemap filename.')
  }
  return filename
}

/**
 * DiskSitemapStorage persists sitemap files to the local file system.
 *
 * It is the default storage backend for single-server Gravito deployments.
 * It automatically handles directory creation and ensures filenames are sanitized
 * to prevent path traversal attacks.
 *
 * @example
 * ```typescript
 * const storage = new DiskSitemapStorage('./public/sitemaps', 'https://example.com/sitemaps');
 * await storage.write('sitemap.xml', '...');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class DiskSitemapStorage implements SitemapStorage {
  private runtime = getRuntimeAdapter()

  constructor(
    private outDir: string,
    private baseUrl: string
  ) {}

  /**
   * Writes sitemap content to a file on the local disk.
   *
   * @param filename - The name of the file to write.
   * @param content - The XML or JSON content.
   */
  async write(filename: string, content: string): Promise<void> {
    const safeName = sanitizeFilename(filename)
    await runtimeMkdir(this.runtime, this.outDir, { recursive: true })
    await this.runtime.writeFile(path.join(this.outDir, safeName), content)
  }

  /**
   * 使用串流方式寫入 sitemap 檔案，可選擇性啟用 gzip 壓縮。
   * 此方法可大幅降低大型 sitemap 的記憶體峰值。
   *
   * @param filename - 檔案名稱
   * @param stream - XML 內容的 AsyncIterable
   * @param options - 寫入選項（如壓縮、content type）
   *
   * @since 3.1.0
   */
  async writeStream(
    filename: string,
    stream: AsyncIterable<string>,
    options?: WriteStreamOptions
  ): Promise<void> {
    const safeName = sanitizeFilename(options?.compress ? toGzipFilename(filename) : filename)
    await runtimeMkdir(this.runtime, this.outDir, { recursive: true })

    const filePath = path.join(this.outDir, safeName)
    const writeStream = createWriteStream(filePath)

    const readable = Readable.from(stream, { encoding: 'utf-8' })

    if (options?.compress) {
      const gzip = createCompressionStream()
      await pipeline(readable, gzip, writeStream)
    } else {
      await pipeline(readable, writeStream)
    }
  }

  /**
   * Reads sitemap content from a file on the local disk.
   *
   * @param filename - The name of the file to read.
   * @returns A promise resolving to the file content as a string, or null if not found.
   */
  async read(filename: string): Promise<string | null> {
    try {
      const safeName = sanitizeFilename(filename)
      return await runtimeReadText(this.runtime, path.join(this.outDir, safeName))
    } catch {
      return null
    }
  }

  /**
   * Returns a readable stream for a sitemap file on the local disk.
   *
   * @param filename - The name of the file to stream.
   * @returns A promise resolving to an async iterable of file chunks, or null if not found.
   */
  async readStream(filename: string): Promise<AsyncIterable<string> | null> {
    try {
      const safeName = sanitizeFilename(filename)
      const fullPath = path.join(this.outDir, safeName)
      if (!(await this.runtime.exists(fullPath))) {
        return null
      }

      const stream = createReadStream(fullPath, { encoding: 'utf-8' })
      return stream as any as AsyncIterable<string>
    } catch {
      return null
    }
  }

  /**
   * Checks if a sitemap file exists on the local disk.
   *
   * @param filename - The name of the file to check.
   * @returns A promise resolving to true if the file exists, false otherwise.
   */
  async exists(filename: string): Promise<boolean> {
    const safeName = sanitizeFilename(filename)
    return this.runtime.exists(path.join(this.outDir, safeName))
  }

  /**
   * Returns the full public URL for a sitemap file.
   *
   * @param filename - The name of the sitemap file.
   * @returns The public URL as a string.
   */
  getUrl(filename: string): string {
    const safeName = sanitizeFilename(filename)
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
    const file = safeName.startsWith('/') ? safeName.slice(1) : safeName
    return `${base}/${file}`
  }
}
