import type {
  ListOptions,
  ListResult,
  PutOptions,
  StorageItem,
  StorageMetadata,
  StorageStore,
} from '../store'

interface MemoryFile {
  data: Blob
  metadata: StorageMetadata
  options?: PutOptions
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
   * @param options - Optional upload options (content-type, metadata, etc.)
   */
  async put(key: string, data: Blob | Buffer | string, options?: PutOptions): Promise<void> {
    let blob: Blob
    if (data instanceof Blob) {
      blob = data
    } else if (typeof data === 'string') {
      blob = new Blob([data], { type: options?.contentType })
    } else {
      blob = new Blob([new Uint8Array(data)], { type: options?.contentType })
    }

    this.files.set(key, {
      data: blob,
      options,
      metadata: {
        key,
        size: blob.size,
        mimeType: options?.contentType || blob.type || 'application/octet-stream',
        lastModified: new Date(),
        customMetadata: options?.metadata,
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

  /**
   * Stores data from a readable stream in memory.
   *
   * 串流寫入記憶體
   * Reads the entire stream into memory before storing.
   *
   * @param key - Unique identifier for the file
   * @param stream - Readable stream containing the data
   */
  async putStream(key: string, stream: ReadableStream<Uint8Array>): Promise<void> {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }

      // Combine all chunks into a single Blob
      const buffer = Buffer.concat(chunks)
      const blob = new Blob([buffer])
      await this.put(key, blob)
    } catch (error) {
      reader.releaseLock()
      throw new Error(`[MemoryStore] Failed to write stream: ${error}`)
    }
  }

  /**
   * Reads an in-memory file as a readable stream.
   *
   * 串流讀取記憶體檔案
   *
   * @param key - Unique identifier for the file
   * @returns Readable stream of file content, or null if not found
   */
  async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    const blob = await this.get(key)
    if (!blob) {
      return null
    }

    return blob.stream()
  }

  /**
   * Updates custom metadata for an in-memory file.
   *
   * 更新自定義 Metadata
   *
   * @param key - Unique identifier for the file
   * @param metadata - Custom metadata to set
   * @throws {Error} If file does not exist
   */
  async setMetadata(key: string, metadata: Record<string, string>): Promise<void> {
    const file = this.files.get(key)
    if (!file) {
      throw new Error(`[MemoryStore] File not found: ${key}`)
    }

    // Merge new metadata with existing metadata
    file.metadata.customMetadata = {
      ...file.metadata.customMetadata,
      ...metadata,
    }

    // Update lastModified
    file.metadata.lastModified = new Date()
  }

  /**
   * Lists files with pagination support.
   *
   * 分頁列舉記憶體中的檔案
   * Provides cursor-based pagination for consistent API with other drivers.
   *
   * @param prefix - Key prefix to filter by
   * @param options - Pagination and filtering options
   * @returns Paginated list result
   */
  async listPaginated(prefix = '', options?: ListOptions): Promise<ListResult> {
    const maxResults = options?.maxResults ?? 1000
    const cursorKey = options?.cursor

    // Get all matching keys
    const allKeys = Array.from(this.files.keys())
      .filter((key) => key.startsWith(prefix))
      .sort() // Ensure consistent ordering

    // Find start position based on cursor
    let startIndex = 0
    if (cursorKey) {
      startIndex = allKeys.findIndex((key) => key > cursorKey)
      if (startIndex === -1) {
        // Cursor is beyond all items
        return {
          items: [],
          nextCursor: null,
          hasMore: false,
          count: 0,
        }
      }
    }

    // Slice the results
    const endIndex = startIndex + maxResults
    const pageKeys = allKeys.slice(startIndex, endIndex)
    const hasMore = endIndex < allKeys.length

    // Build items
    const items: StorageItem[] = pageKeys.map((key) => {
      const file = this.files.get(key)!
      return {
        key,
        isDirectory: false,
        size: file.metadata.size,
        lastModified: file.metadata.lastModified,
      }
    })

    // Next cursor is the last key in this page
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].key : null

    return {
      items,
      nextCursor,
      hasMore,
      count: items.length,
    }
  }
}
