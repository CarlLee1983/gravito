import { StorageRepository } from './StorageRepository'
import type { StorageItem, StorageMetadata, StorageStore } from './store'
import type { StorageHooks } from './types'

export class StorageManager {
  private stores = new Map<string, StorageStore>()
  private repositories = new Map<string, StorageRepository>()

  constructor(
    private readonly storeFactory: (name: string) => StorageStore,
    private readonly options: {
      default: string
      prefix?: string
    },
    private readonly hooks?: StorageHooks
  ) {}

  disk(name?: string): StorageRepository {
    const diskName = name ?? this.options.default

    if (!this.repositories.has(diskName)) {
      const store = this.resolveStore(diskName)
      this.repositories.set(diskName, new StorageRepository(store, this.hooks))
    }

    return this.repositories.get(diskName)!
  }

  private resolveStore(name: string): StorageStore {
    if (!this.stores.has(name)) {
      this.stores.set(name, this.storeFactory(name))
    }
    return this.stores.get(name)!
  }

  put(key: string, data: Blob | Buffer | string): Promise<void> {
    return this.disk().put(key, data)
  }

  get(key: string): Promise<Blob | null> {
    return this.disk().get(key)
  }

  delete(key: string): Promise<boolean> {
    return this.disk().delete(key)
  }

  exists(key: string): Promise<boolean> {
    return this.disk().exists(key)
  }

  copy(from: string, to: string): Promise<void> {
    return this.disk().copy(from, to)
  }

  move(from: string, to: string): Promise<void> {
    return this.disk().move(from, to)
  }

  list(prefix?: string): AsyncIterable<StorageItem> {
    return this.disk().list(prefix)
  }

  getMetadata(key: string): Promise<StorageMetadata | null> {
    return this.disk().getMetadata(key)
  }

  getUrl(key: string): string {
    return this.disk().getUrl(key)
  }

  getSignedUrl(key: string, expiresIn: number): Promise<string> {
    return this.disk().getSignedUrl(key, expiresIn)
  }
}
