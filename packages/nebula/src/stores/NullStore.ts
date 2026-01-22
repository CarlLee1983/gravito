import type { StorageItem, StorageMetadata, StorageStore } from '../store'

export class NullStore implements StorageStore {
  async put(_key: string, _data: Blob | Buffer | string): Promise<void> {}

  async get(_key: string): Promise<Blob | null> {
    return null
  }

  async delete(_key: string): Promise<boolean> {
    return false
  }

  async exists(_key: string): Promise<boolean> {
    return false
  }

  async copy(_from: string, _to: string): Promise<void> {}

  async move(_from: string, _to: string): Promise<void> {}

  async *list(_prefix?: string): AsyncIterable<StorageItem> {}

  async getMetadata(_key: string): Promise<StorageMetadata | null> {
    return null
  }

  getUrl(key: string): string {
    return `/null/${key}`
  }
}
