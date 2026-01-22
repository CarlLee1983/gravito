import type { StorageItem, StorageMetadata, StorageStore } from '../store'

interface MemoryFile {
  data: Blob
  metadata: StorageMetadata
}

export class MemoryStore implements StorageStore {
  private files = new Map<string, MemoryFile>()

  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    let blob: Blob
    if (data instanceof Blob) {
      blob = data
    } else if (typeof data === 'string') {
      blob = new Blob([data])
    } else {
      blob = new Blob([new Uint8Array(data)])
    }

    this.files.set(key, {
      data: blob,
      metadata: {
        key,
        size: blob.size,
        mimeType: blob.type || 'application/octet-stream',
        lastModified: new Date(),
      },
    })
  }

  async get(key: string): Promise<Blob | null> {
    return this.files.get(key)?.data ?? null
  }

  async delete(key: string): Promise<boolean> {
    return this.files.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key)
  }

  async copy(from: string, to: string): Promise<void> {
    const file = this.files.get(from)
    if (!file) {
      throw new Error(`[MemoryStore] Source file not found: ${from}`)
    }

    this.files.set(to, {
      data: file.data,
      metadata: { ...file.metadata, key: to, lastModified: new Date() },
    })
  }

  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to)
    await this.delete(from)
  }

  async *list(prefix = ''): AsyncIterable<StorageItem> {
    for (const [key, file] of this.files.entries()) {
      if (key.startsWith(prefix)) {
        yield {
          key,
          isDirectory: false,
          size: file.metadata.size,
          lastModified: file.metadata.lastModified,
        }
      }
    }
  }

  async getMetadata(key: string): Promise<StorageMetadata | null> {
    return this.files.get(key)?.metadata ?? null
  }

  getUrl(key: string): string {
    return `/memory/${key}`
  }
}
