import type { StorageItem, StorageMetadata, StorageStore } from './store'
import type { StorageHooks } from './types'

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
   * @throws {Error} If the underlying store fails to persist the data
   */
  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    const finalData = this.hooks
      ? await this.hooks.applyFilter('storage:upload', data, { key })
      : data

    await this.store.put(key, finalData)

    if (this.hooks) {
      await this.hooks.doAction('storage:uploaded', { key })
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
      throw new Error('[StorageRepository] This storage driver does not support listing files.')
    }

    yield* this.store.list(prefix)
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
      throw new Error('[StorageRepository] This storage driver does not support signed URLs.')
    }

    return this.store.getSignedUrl(key, expiresIn)
  }
}
