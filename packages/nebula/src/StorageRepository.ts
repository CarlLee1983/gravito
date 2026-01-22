import type { StorageItem, StorageMetadata, StorageStore } from './store'
import type { StorageHooks } from './types'

export class StorageRepository {
  constructor(
    private readonly store: StorageStore,
    private readonly hooks?: StorageHooks
  ) {}

  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    const finalData = this.hooks
      ? await this.hooks.applyFilter('storage:upload', data, { key })
      : data

    await this.store.put(key, finalData)

    if (this.hooks) {
      await this.hooks.doAction('storage:uploaded', { key })
    }
  }

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

  async delete(key: string): Promise<boolean> {
    const deleted = await this.store.delete(key)

    if (deleted && this.hooks) {
      await this.hooks.doAction('storage:deleted', { key })
    }

    return deleted
  }

  async exists(key: string): Promise<boolean> {
    return this.store.exists(key)
  }

  async copy(from: string, to: string): Promise<void> {
    await this.store.copy(from, to)

    if (this.hooks) {
      await this.hooks.doAction('storage:copied', { from, to })
    }
  }

  async move(from: string, to: string): Promise<void> {
    await this.store.move(from, to)

    if (this.hooks) {
      await this.hooks.doAction('storage:moved', { from, to })
    }
  }

  async *list(prefix?: string): AsyncIterable<StorageItem> {
    if (!this.store.list) {
      throw new Error('[StorageRepository] This storage driver does not support listing files.')
    }

    yield* this.store.list(prefix)
  }

  async getMetadata(key: string): Promise<StorageMetadata | null> {
    return this.store.getMetadata(key)
  }

  getUrl(key: string): string {
    return this.store.getUrl(key)
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    if (!this.store.getSignedUrl) {
      throw new Error('[StorageRepository] This storage driver does not support signed URLs.')
    }

    return this.store.getSignedUrl(key, expiresIn)
  }
}
