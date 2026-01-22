import { mkdir } from 'node:fs/promises'
import { isAbsolute, normalize, resolve, sep } from 'node:path'
import { getRuntimeAdapter } from '@gravito/core'
import type { StorageItem, StorageMetadata, StorageStore } from '../store'

export class LocalStore implements StorageStore {
  private runtime = getRuntimeAdapter()

  constructor(
    private readonly rootDir: string,
    private readonly baseUrl = '/storage'
  ) {}

  async put(key: string, data: Blob | Buffer | string): Promise<void> {
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
      throw new Error(`[LocalStore] Source file not found: ${from}`)
    }
    await this.put(to, data)
  }

  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to)
    await this.delete(from)
  }

  list(prefix = ''): AsyncIterable<StorageItem> {
    throw new Error(
      '[LocalStore] list() is not yet implemented. ' +
        'Requires RuntimeAdapter.readDir() support in @gravito/core.'
    )
  }

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

  getUrl(key: string): string {
    const safeKey = this.normalizeKey(key)
    return `${this.baseUrl}/${safeKey}`
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
