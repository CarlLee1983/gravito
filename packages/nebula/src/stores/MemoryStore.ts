import type { StorageItem, StorageMetadata, StorageStore } from '../store'

interface MemoryFile {
  data: Blob
  metadata: StorageMetadata
}

/**
 * MemoryStore implements a volatile, in-memory storage backend.
 *
 * It is primarily intended for testing, caching, or temporary data that
 * does not need to persist across application restarts. All data is stored
 * in a Map as Blobs.
 *
 * @example
 * ```typescript
 * const store = new MemoryStore();
 * await store.put('test.txt', 'hello');
 * ```
 *
 * @public
 */
export class MemoryStore implements StorageStore {
  private files = new Map<string, MemoryFile>()

  /**
   * Stores data in the internal Map.
   *
   * Converts input data to a Blob before storage.
   *
   * @param key - Unique identifier for the file
   * @param data - Content to store
   */
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

  /**
   * Retrieves a Blob from the internal Map.
   *
   * @param key - Unique identifier for the file
   * @returns The Blob content, or null if not found
   */
  async get(key: string): Promise<Blob | null> {
    return this.files.get(key)?.data ?? null
  }

  /**
   * Removes a file from memory.
   *
   * @param key - Unique identifier for the file
   * @returns True if deleted, false if not found
   */
  async delete(key: string): Promise<boolean> {
    return this.files.delete(key)
  }

  /**
   * Checks if a key exists in the internal Map.
   *
   * @param key - Unique identifier to check
   * @returns True if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    return this.files.has(key)
  }

  /**
   * Copies a file within memory.
   *
   * @param from - Source key
   * @param to - Destination key
   * @throws {Error} If source file is missing
   */
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

  /**
   * Moves a file within memory.
   *
   * @param from - Current key
   * @param to - New key
   * @throws {Error} If source file is missing
   */
  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to)
    await this.delete(from)
  }

  /**
   * Lists all files currently in memory.
   *
   * @param prefix - Optional key prefix to filter by
   * @returns Async iterable of storage items
   */
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

  /**
   * Retrieves metadata for an in-memory file.
   *
   * @param key - Unique identifier for the file
   * @returns Metadata object or null if not found
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    return this.files.get(key)?.metadata ?? null
  }

  /**
   * Generates a dummy URL for the in-memory file.
   *
   * @param key - Unique identifier for the file
   * @returns A string starting with /memory/
   */
  getUrl(key: string): string {
    return `/memory/${key}`
  }
}
