import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { isAbsolute, join, normalize, resolve, sep } from 'node:path'
import { getArchiveAdapter, getRuntimeAdapter } from '@gravito/core'
import type { PutOptions, StorageItem, StorageMetadata, StorageStore } from '../store'

/**
 * LocalStore implements storage on the local filesystem.
 *
 * It uses the Gravito RuntimeAdapter to perform file operations, ensuring
 * compatibility across different environments (Node.js, Bun, etc.). It includes
 * built-in protection against path traversal attacks.
 *
 * @example
 * ```typescript
 * const store = new LocalStore('./uploads', '/public/files');
 * await store.put('avatars/user.png', data);
 * ```
 *
 * @public
 */
export class LocalStore implements StorageStore {
  private runtime = getRuntimeAdapter()

  constructor(
    private readonly rootDir: string,
    private readonly baseUrl = '/storage'
  ) {}

  /**
   * Writes data to a file on the local disk.
   *
   * Automatically creates parent directories if they don't exist.
   *
   * @param key - Relative path from the root directory
   * @param data - Content to write
   * @param options - Optional upload options (note: customMetadata not persisted in LocalStore)
   * @throws {Error} If the key is invalid or path is outside root
   */
  async put(key: string, data: Blob | Buffer | string, _options?: PutOptions): Promise<void> {
    const path = this.resolvePath(key)
    await this.ensureDirectory(path)
    await this.runtime.writeFile(path, data)

    // Note: LocalStore does not persist customMetadata or other options
    // These options are primarily for S3/Cloud storage drivers
    // In the future, we could store metadata in a separate .meta file or extended attributes
  }

  /**
   * Reads a file from the local disk as a Blob.
   *
   * @param key - Relative path from the root directory
   * @returns File content as Blob, or null if not found
   * @throws {Error} If the key is invalid or path is outside root
   */
  async get(key: string): Promise<Blob | null> {
    if (!(await this.exists(key))) {
      return null
    }

    const path = this.resolvePath(key)
    return this.runtime.readFileAsBlob(path)
  }

  /**
   * Deletes a file from the local disk.
   *
   * @param key - Relative path from the root directory
   * @returns True if deleted, false if file didn't exist
   * @throws {Error} If the key is invalid or path is outside root
   */
  async delete(key: string): Promise<boolean> {
    if (!(await this.exists(key))) {
      return false
    }

    const path = this.resolvePath(key)
    await this.runtime.deleteFile(path)
    return true
  }

  /**
   * Checks if a file exists on the local disk.
   *
   * @param key - Relative path from the root directory
   * @returns True if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    const path = this.resolvePath(key)
    return this.runtime.exists(path)
  }

  /**
   * Copies a file on the local disk.
   *
   * @param from - Source relative path
   * @param to - Destination relative path
   * @throws {Error} If source missing or operation fails
   */
  async copy(from: string, to: string): Promise<void> {
    const data = await this.get(from)
    if (!data) {
      throw new Error(`[LocalStore] Source file not found: ${from}`)
    }
    await this.put(to, data)
  }

  /**
   * Moves a file on the local disk.
   *
   * @param from - Current relative path
   * @param to - New relative path
   * @throws {Error} If source missing or operation fails
   */
  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to)
    await this.delete(from)
  }

  /**
   * @internal
   * @throws {Error} Always, as not yet implemented
   */
  list(_prefix = ''): AsyncIterable<StorageItem> {
    throw new Error(
      '[LocalStore] list() is not yet implemented. ' +
        'Requires RuntimeAdapter.readDir() support in @gravito/core.'
    )
  }

  /**
   * Retrieves file metadata from the local filesystem.
   *
   * @param key - Relative path from the root directory
   * @returns Metadata object or null if not found
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    if (!(await this.exists(key))) {
      return null
    }

    const path = this.resolvePath(key)
    const stat = await this.runtime.stat(path)

    return {
      key,
      size: stat.size,
      mimeType: this.guessMimeType(key),
      lastModified: new Date(),
    }
  }

  /**
   * Generates a public URL based on the configured base URL.
   *
   * @param key - Relative path from the root directory
   * @returns URL string
   */
  getUrl(key: string): string {
    const safeKey = this.normalizeKey(key)
    return `${this.baseUrl}/${safeKey}`
  }

  /**
   * Writes data from a readable stream to a file on the local disk.
   *
   * 串流寫入檔案
   * Automatically creates parent directories if they don't exist.
   * Useful for handling large files without loading entire content into memory.
   *
   * @param key - Relative path from the root directory
   * @param stream - Readable stream containing the data
   * @throws {Error} If the key is invalid or path is outside root
   */
  async putStream(key: string, stream: ReadableStream<Uint8Array>): Promise<void> {
    const path = this.resolvePath(key)
    await this.ensureDirectory(path)

    // Use Bun's native file writer for stream support
    const file = Bun.file(path)
    const writer = file.writer()
    const reader = stream.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        writer.write(value)
      }
      await writer.end()
    } catch (error) {
      reader.releaseLock()
      throw new Error(`[LocalStore] Failed to write stream: ${error}`)
    }
  }

  /**
   * Reads a file from the local disk as a readable stream.
   *
   * 串流讀取檔案
   * Useful for handling large files without loading entire content into memory.
   *
   * @param key - Relative path from the root directory
   * @returns Readable stream of file content, or null if not found
   * @throws {Error} If the key is invalid or path is outside root
   */
  async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    if (!(await this.exists(key))) {
      return null
    }

    const path = this.resolvePath(key)
    const file = Bun.file(path)
    return file.stream()
  }

  /**
   * 備份存儲目錄為壓縮歸檔（.tar.gz）
   *
   * @param outputPath - 歸檔輸出路徑（含副檔名 .tar.gz）
   * @throws {Error} 如果掃描目錄或建立歸檔失敗
   */
  async backup(outputPath: string): Promise<void> {
    const archiveAdapter = getArchiveAdapter()
    const runtime = getRuntimeAdapter()
    const entries: Record<string, Uint8Array> = {}

    const scanDir = async (dir: string, prefix = ''): Promise<void> => {
      try {
        const items = await readdir(dir)
        for (const item of items) {
          const itemPath = join(dir, item)
          const itemStat = await stat(itemPath)

          if (itemStat.isDirectory()) {
            await scanDir(itemPath, `${prefix}${item}/`)
          } else {
            const relativePath = `${prefix}${item}`.replace(/\\/g, '/')
            entries[relativePath] = await runtime.readFile(itemPath)
          }
        }
      } catch (err) {
        throw new Error(`[LocalStore] Backup scan failed at ${dir}: ${err}`)
      }
    }

    await scanDir(resolve(this.rootDir))

    const archiveData = await archiveAdapter.create(entries, { compress: 'gzip' })
    await runtime.writeFile(outputPath, archiveData)
  }

  /**
   * 從備份歸檔還原存儲目錄
   *
   * 會先清空現有的存儲目錄，再從歸檔提取所有檔案。
   *
   * @param archivePath - 備份歸檔路徑
   * @throws {Error} 如果歸檔不存在或提取失敗
   */
  async restore(archivePath: string): Promise<void> {
    const archiveAdapter = getArchiveAdapter()
    const runtime = getRuntimeAdapter()

    // 讀取歸檔資料
    const archiveData = await runtime.readFile(archivePath)
    if (!archiveData || archiveData.length === 0) {
      throw new Error(`[LocalStore] Backup file not found or empty: ${archivePath}`)
    }

    const rootDir = resolve(this.rootDir)
    const tempDir = `${rootDir}.restore-${Date.now()}`

    try {
      // 建立臨時目錄並提取
      await mkdir(tempDir, { recursive: true })
      await archiveAdapter.extract(archiveData, tempDir, {})

      // 清空現有存儲
      await this.clearDirectory(rootDir)

      // 將臨時目錄的檔案複製到 rootDir
      const copyDir = async (src: string, dst: string): Promise<void> => {
        const items = await readdir(src)
        for (const item of items) {
          const srcPath = join(src, item)
          const dstPath = join(dst, item)
          const itemStat = await stat(srcPath)

          if (itemStat.isDirectory()) {
            await mkdir(dstPath, { recursive: true })
            await copyDir(srcPath, dstPath)
          } else {
            const content = await runtime.readFile(srcPath)
            await runtime.writeFile(dstPath, content)
          }
        }
      }

      await copyDir(tempDir, rootDir)
    } finally {
      // 清理臨時目錄（忽略錯誤）
      try {
        await rm(tempDir, { recursive: true, force: true })
      } catch {
        // 忽略清理錯誤
      }
    }
  }

  /**
   * 遞迴清空目錄中的所有內容（保留目錄本身）
   */
  private async clearDirectory(dir: string): Promise<void> {
    try {
      const items = await readdir(dir)
      await Promise.all(items.map((item) => rm(join(dir, item), { recursive: true, force: true })))
    } catch {
      // 目錄不存在或無法存取時靜默忽略
    }
  }

  private normalizeKey(key: string): string {
    if (!key || key.includes('\0')) {
      throw new Error('[LocalStore] Invalid storage key: empty or contains null byte.')
    }

    const normalized = normalize(key).replace(/^[/\\]+/, '')

    if (
      normalized === '.' ||
      normalized === '..' ||
      normalized.startsWith(`..${sep}`) ||
      normalized.startsWith(`.${sep}`) ||
      isAbsolute(normalized)
    ) {
      throw new Error('[LocalStore] Invalid storage key: path traversal attempt.')
    }

    return normalized.replace(/\\/g, '/')
  }

  private resolvePath(key: string): string {
    const normalized = this.normalizeKey(key)
    const root = resolve(this.rootDir)
    const resolved = resolve(root, normalized)

    const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`
    if (!resolved.startsWith(rootPrefix) && resolved !== root) {
      throw new Error('[LocalStore] Invalid storage key: resolved path outside root.')
    }

    return resolved
  }

  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = filePath.substring(0, filePath.lastIndexOf(sep))
    if (dir && dir !== this.rootDir) {
      await mkdir(dir, { recursive: true })
    }
  }

  private guessMimeType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      txt: 'text/plain',
      html: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      zip: 'application/zip',
    }
    return mimeTypes[ext ?? ''] ?? 'application/octet-stream'
  }
}
