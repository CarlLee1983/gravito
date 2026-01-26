import type { StorageItem, StorageMetadata, StorageStore } from '../store'

/**
 * NullStore implements the Null Object pattern for storage.
 *
 * It provides a no-op implementation of the StorageStore interface. All write
 * operations succeed silently without doing anything, and all read operations
 * return null or empty results. This is useful for disabling storage without
 * changing application logic.
 *
 * @example
 * ```typescript
 * const store = new NullStore();
 * await store.put('anything', 'data'); // Does nothing
 * ```
 *
 * @public
 */
export class NullStore implements StorageStore {
  /**
   * No-op: does not store any data.
   */
  async put(_key: string, _data: Blob | Buffer | string): Promise<void> {}

  /**
   * Always returns null.
   */
  async get(_key: string): Promise<Blob | null> {
    return null
  }

  /**
   * Always returns false.
   */
  async delete(_key: string): Promise<boolean> {
    return false
  }

  /**
   * Always returns false.
   */
  async exists(_key: string): Promise<boolean> {
    return false
  }

  /**
   * No-op: does not copy anything.
   */
  async copy(_from: string, _to: string): Promise<void> {}

  /**
   * No-op: does not move anything.
   */
  async move(_from: string, _to: string): Promise<void> {}

  /**
   * Always yields nothing.
   */
  async *list(_prefix?: string): AsyncIterable<StorageItem> {}

  /**
   * Always returns null.
   */
  async getMetadata(_key: string): Promise<StorageMetadata | null> {
    return null
  }

  /**
   * Generates a dummy URL starting with /null/.
   */
  getUrl(key: string): string {
    return `/null/${key}`
  }
}
