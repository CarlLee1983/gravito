import type {
  ListOptions,
  ListResult,
  PutOptions,
  StorageItem,
  StorageMetadata,
  StorageStore,
} from './store'
import type { StorageHooks } from './types'
import { NebulaError } from './errors/NebulaError'
import { NebulaErrorCodes } from './errors/codes'

/**
 * StorageRepository wraps a StorageStore to provide high-level features.
 *
 * It implements the Repository pattern, adding cross-cutting concerns like
 * hooks (filters and actions) to the raw store operations. This allows for
 * global behaviors like image resizing on upload or logging on deletion.
 *
 * @public
 */
export class StorageRepository {
  constructor(
    private readonly store: StorageStore,
    private readonly hooks?: StorageHooks
  ) {}

  /**
   * Stores content and triggers upload hooks.
   *
   * Applies the `storage:upload` filter to the data before storage and
   * fires the `storage:uploaded` action upon success.
   *
   * @param key - The destination path
   * @param data - The content to store
   * @param options - Optional upload options (content-type, metadata, cache-control, etc.)
   * @throws {Error} If the underlying store fails to persist the data
   */
  async put(key: string, data: Blob | Buffer | string, options?: PutOptions): Promise<void> {
    const finalData = this.hooks
      ? await this.hooks.applyFilter('storage:upload', data, { key, options })
      : data

    await this.store.put(key, finalData, options)

    if (this.hooks) {
      await this.hooks.doAction('storage:uploaded', { key, options })
    }
  }

  /**
   * Retrieves content and triggers hit/miss hooks.
   *
   * Fires `storage:hit` if the file exists, or `storage:miss` otherwise.
   *
   * @param key - The path of the file to retrieve
   * @returns The file content as a Blob, or null if not found
   */
  async get(key: string): Promise<Blob | null> {
    const data = await this.store.get(key)

    if (this.hooks) {
      if (data) {
        await this.hooks.doAction('storage:hit', { key })
      } else {
        await this.hooks.doAction('storage:miss', { key })
      }
    }

    return data
  }

  /**
   * Deletes a file and triggers the deleted hook.
   *
   * Fires `storage:deleted` only if the file was actually removed.
   *
   * @param key - The path of the file to delete
   * @returns True if deleted, false if file didn't exist
   */
  async delete(key: string): Promise<boolean> {
    const deleted = await this.store.delete(key)

    if (deleted && this.hooks) {
      await this.hooks.doAction('storage:deleted', { key })
    }

    return deleted
  }

  /**
   * Checks for file existence.
   *
   * @param key - The path to check
   * @returns True if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    return this.store.exists(key)
  }

  /**
   * Copies a file and triggers the copied hook.
   *
   * Fires `storage:copied` upon successful completion.
   *
   * @param from - Source path
   * @param to - Destination path
   * @throws {Error} If source missing or operation fails
   */
  async copy(from: string, to: string): Promise<void> {
    await this.store.copy(from, to)

    if (this.hooks) {
      await this.hooks.doAction('storage:copied', { from, to })
    }
  }

  /**
   * Moves a file and triggers the moved hook.
   *
   * Fires `storage:moved` upon successful completion.
   *
   * @param from - Current path
   * @param to - New path
   * @throws {Error} If source missing or operation fails
   */
  async move(from: string, to: string): Promise<void> {
    await this.store.move(from, to)

    if (this.hooks) {
      await this.hooks.doAction('storage:moved', { from, to })
    }
  }

  /**
   * Lists files using an async generator.
   *
   * @param prefix - Path prefix to filter by
   * @returns Async iterable of storage items
   * @throws {Error} If the underlying driver does not support listing
   */
  async *list(prefix?: string): AsyncIterable<StorageItem> {
    if (!this.store.list) {
      throw new NebulaError(501, NebulaErrorCodes.OPERATION_NOT_SUPPORTED, {
        message: '[StorageRepository] This storage driver does not support listing files.',
      })
    }

    yield* this.store.list(prefix)
  }

  /**
   * Lists files with pagination support.
   *
   * 分頁列舉檔案
   * Recommended for large storage backends to prevent OOM.
   * Provides cursor-based pagination for efficient enumeration.
   *
   * @param prefix - Path prefix to filter by
   * @param options - Pagination and filtering options
   * @returns Paginated list result with cursor for next page
   * @throws {Error} If the underlying driver does not support paginated listing
   */
  async listPaginated(prefix: string, options?: ListOptions): Promise<ListResult> {
    if (!this.store.listPaginated) {
      throw new NebulaError(501, NebulaErrorCodes.OPERATION_NOT_SUPPORTED, {
        message: '[StorageRepository] This storage driver does not support paginated listing.',
      })
    }

    return this.store.listPaginated(prefix, options)
  }

  /**
   * Retrieves file metadata.
   *
   * @param key - Path of the file
   * @returns Metadata object or null if not found
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    return this.store.getMetadata(key)
  }

  /**
   * Updates custom metadata for a file.
   *
   * 更新自定義 Metadata
   *
   * @param key - Path of the file
   * @param metadata - Custom metadata to set
   * @throws {Error} If the underlying driver does not support metadata updates
   */
  async setMetadata(key: string, metadata: Record<string, string>): Promise<void> {
    if (!this.store.setMetadata) {
      throw new NebulaError(501, NebulaErrorCodes.OPERATION_NOT_SUPPORTED, {
        message: '[StorageRepository] This storage driver does not support metadata updates.',
      })
    }

    await this.store.setMetadata(key, metadata)
  }

  /**
   * Generates a public URL.
   *
   * @param key - Path of the file
   * @returns URL string
   */
  getUrl(key: string): string {
    return this.store.getUrl(key)
  }

  /**
   * Generates a temporary signed URL.
   *
   * @param key - Path of the file
   * @param expiresIn - Expiration in seconds
   * @returns Signed URL string
   * @throws {Error} If the underlying driver does not support signed URLs
   */
  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    if (!this.store.getSignedUrl) {
      throw new NebulaError(501, NebulaErrorCodes.OPERATION_NOT_SUPPORTED, {
        message: '[StorageRepository] This storage driver does not support signed URLs.',
      })
    }

    return this.store.getSignedUrl(key, expiresIn)
  }

  /**
   * Stores content from a readable stream and triggers upload hooks.
   *
   * 串流上傳並觸發 hooks
   * Useful for handling large files without loading entire content into memory.
   * Applies the `storage:upload` filter and fires the `storage:uploaded` action.
   *
   * @param key - The destination path
   * @param stream - Readable stream containing the data
   * @throws {Error} If the underlying driver does not support stream writing
   */
  async putStream(key: string, stream: ReadableStream<Uint8Array>): Promise<void> {
    if (!this.store.putStream) {
      throw new NebulaError(501, NebulaErrorCodes.OPERATION_NOT_SUPPORTED, {
        message: '[StorageRepository] This storage driver does not support stream writing.',
      })
    }

    // Note: Filter hooks for streams would need to handle ReadableStream type
    // For now, we apply the stream directly without filtering
    await this.store.putStream(key, stream)

    if (this.hooks) {
      await this.hooks.doAction('storage:uploaded', { key })
    }
  }

  /**
   * Retrieves content as a readable stream and triggers hit/miss hooks.
   *
   * 串流讀取並觸發 hooks
   * Useful for handling large files without loading entire content into memory.
   * Fires `storage:hit` if the file exists, or `storage:miss` otherwise.
   *
   * @param key - Path of the file
   * @returns Readable stream of file content, or null if not found
   * @throws {Error} If the underlying driver does not support stream reading
   */
  async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    if (!this.store.getStream) {
      throw new NebulaError(501, NebulaErrorCodes.OPERATION_NOT_SUPPORTED, {
        message: '[StorageRepository] This storage driver does not support stream reading.',
      })
    }

    const stream = await this.store.getStream(key)

    if (this.hooks) {
      if (stream) {
        await this.hooks.doAction('storage:hit', { key })
      } else {
        await this.hooks.doAction('storage:miss', { key })
      }
    }

    return stream
  }
}
