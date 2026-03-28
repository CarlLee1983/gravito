import { isAbsolute, join, normalize, resolve, sep } from 'node:path'
import {
  archiveFromDirectory,
  getArchiveAdapter,
  getRuntimeAdapter,
  runtimeMkdir,
  runtimeStatFull,
} from '@gravito/core'
import type { PutOptions, StorageItem, StorageMetadata, StorageStore } from '../store'
import { NebulaError } from '../errors/NebulaError'
import { NebulaErrorCodes } from '../errors/codes'

/**
 * LocalStore implements storage on the local filesystem.
 *
 * It uses the Gravito RuntimeAdapter to perform file operations, ensuring
 * compatibility across different environments (Node.js, Bun, etc.). It includes
 * built-in protection against path traversal attacks.
 */
export class LocalStore implements StorageStore {
  private runtime = getRuntimeAdapter()

  constructor(
    private readonly rootDir: string,
    private readonly baseUrl = '/storage'
  ) {}

  async put(key: string, data: Blob | Buffer | string, _options?: PutOptions): Promise<void> {
    const path = this.resolvePath(key)
    await this.ensureDirectory(path)
    await this.runtime.writeFile(path, data)
  }

  async get(key: string): Promise<Blob | null> {
    if (!(await this.exists(key))) {
      return null
    }
    const path = this.resolvePath(key)
    return this.runtime.readFileAsBlob(path)
  }

  async delete(key: string): Promise<boolean> {
    if (!(await this.exists(key))) {
      return false
    }
    const path = this.resolvePath(key)
    await this.runtime.deleteFile(path)
    return true
  }

  async exists(key: string): Promise<boolean> {
    const path = this.resolvePath(key)
    return this.runtime.exists(path)
  }

  async copy(from: string, to: string): Promise<void> {
    const data = await this.get(from)
    if (!data) {
      throw new NebulaError(404, NebulaErrorCodes.COPY_SOURCE_NOT_FOUND, {
        message: `[LocalStore] Source file not found: ${from}`,
      })
    }
    await this.put(to, data)
  }

  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to)
    await this.delete(from)
  }

  list(_prefix = ''): AsyncIterable<StorageItem> {
    throw new NebulaError(501, NebulaErrorCodes.OPERATION_NOT_SUPPORTED, {
      message:
        '[LocalStore] list() is not yet implemented. ' +
        'Requires RuntimeAdapter.readDir() support in @gravito/core.',
    })
  }

  async getMetadata(key: string): Promise<StorageMetadata | null> {
    if (!(await this.exists(key))) {
      return null
    }
    const path = this.resolvePath(key)
    const stat = await runtimeStatFull(this.runtime, path)
    return {
      key,
      size: stat.size,
      mimeType: this.guessMimeType(key),
      lastModified: new Date(stat.mtimeMs),
    }
  }

  getUrl(key: string): string {
    const safeKey = this.normalizeKey(key)
    return `${this.baseUrl}/${safeKey}`
  }

  async putStream(key: string, stream: ReadableStream<Uint8Array>): Promise<void> {
    const path = this.resolvePath(key)
    await this.ensureDirectory(path)
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
      throw new NebulaError(503, NebulaErrorCodes.WRITE_STREAM_FAILED, {
        message: `[LocalStore] Failed to write stream: ${error}`,
        cause: error instanceof Error ? error : undefined,
        retryable: true,
      })
    }
  }

  async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    if (!(await this.exists(key))) {
      return null
    }
    const path = this.resolvePath(key)
    const file = Bun.file(path)
    return file.stream()
  }

  async backup(outputPath: string): Promise<void> {
    await archiveFromDirectory(resolve(this.rootDir), outputPath, { compress: 'gzip' })
  }

  async restore(archivePath: string): Promise<void> {
    const archiveAdapter = getArchiveAdapter()
    const runtime = this.runtime
    const archiveData = await runtime.readFile(archivePath)
    if (!archiveData || archiveData.length === 0) {
      throw new NebulaError(404, NebulaErrorCodes.FILE_NOT_FOUND, {
        message: `[LocalStore] Backup file not found or empty: ${archivePath}`,
      })
    }
    const rootDir = resolve(this.rootDir)
    const tempDir = `${rootDir}.restore-${Date.now()}`
    try {
      await runtimeMkdir(runtime, tempDir, { recursive: true })
      await archiveAdapter.extract(archiveData, tempDir, {})
      await this.clearDirectory(rootDir)
      const copyDir = async (src: string, dst: string): Promise<void> => {
        const items = await runtime.readDir?.(src)
        if (items) {
          for (const item of items) {
            const srcPath = join(src, item.name)
            const dstPath = join(dst, item.name)
            if (item.isDirectory) {
              await runtimeMkdir(runtime, dstPath, { recursive: true })
              await copyDir(srcPath, dstPath)
            } else {
              const content = await runtime.readFile(srcPath)
              await runtime.writeFile(dstPath, content)
            }
          }
        }
      }
      await copyDir(tempDir, rootDir)
    } finally {
      try {
        await runtime.removeRecursive?.(tempDir)
      } catch {}
    }
  }

  private async clearDirectory(dir: string): Promise<void> {
    try {
      const items = await this.runtime.readDir?.(dir)
      if (items) {
        await Promise.all(items.map((item) => this.runtime.removeRecursive?.(join(dir, item.name))))
      }
    } catch {}
  }

  private normalizeKey(key: string): string {
    if (!key || key.includes('\0')) {
      throw new NebulaError(400, NebulaErrorCodes.INVALID_STORAGE_KEY, {
        message: '[LocalStore] Invalid storage key: empty or contains null byte.',
      })
    }
    const normalized = normalize(key).replace(/^[/\\]+/, '')
    if (
      normalized === '.' ||
      normalized === '..' ||
      normalized.startsWith(`..${sep}`) ||
      normalized.startsWith(`.${sep}`) ||
      isAbsolute(normalized)
    ) {
      throw new NebulaError(400, NebulaErrorCodes.INVALID_STORAGE_KEY, {
        message: '[LocalStore] Invalid storage key: path traversal attempt.',
      })
    }
    return normalized.replace(/\\/g, '/')
  }

  private resolvePath(key: string): string {
    const normalized = this.normalizeKey(key)
    const root = resolve(this.rootDir)
    const resolved = resolve(root, normalized)
    const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`
    if (!resolved.startsWith(rootPrefix) && resolved !== root) {
      throw new NebulaError(400, NebulaErrorCodes.INVALID_STORAGE_KEY, {
        message: '[LocalStore] Invalid storage key: resolved path outside root.',
      })
    }
    return resolved
  }

  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = filePath.substring(0, filePath.lastIndexOf(sep))
    if (dir && dir !== this.rootDir) {
      await runtimeMkdir(this.runtime, dir, { recursive: true })
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
