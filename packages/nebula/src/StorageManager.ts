import { StorageRepository } from './StorageRepository'
import type {
  ListOptions,
  ListResult,
  PutOptions,
  StorageItem,
  StorageMetadata,
  StorageStore,
} from './store'
import type { StorageHooks } from './types'

/**
 * StorageManager acts as the central hub for multi-disk storage management.
 *
 * It implements the Manager pattern to coordinate multiple storage repositories (disks).
 * It provides a unified API that delegates to the default disk or a specifically
 * requested disk. It also handles the lazy initialization of storage stores.
 *
 * @example
 * ```typescript
 * const manager = new StorageManager(factory, { default: 'local' });
 * await manager.put('hello.txt', 'world'); // Uses default 'local' disk
 * await manager.disk('s3').put('backup.zip', data); // Uses 's3' disk
 * ```
 *
 * @public
 */
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

  /**
   * Accesses a specific storage disk by name.
   *
   * If no name is provided, the default disk configured during initialization is returned.
   * Repositories are lazily initialized and cached for subsequent access.
   *
   * @param name - The unique identifier of the disk to access
   * @returns A repository instance for the requested disk
   * @throws {Error} If the requested disk is not configured or factory fails
   */
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

  /**
   * Stores content at the specified key on the default disk.
   *
   * @param key - The destination path/identifier
   * @param data - The content to store
   * @param options - Optional upload options (content-type, metadata, cache-control, etc.)
   * @returns A promise that resolves when the operation completes
   * @throws {Error} If the storage operation fails on the default disk
   */
  put(key: string, data: Blob | Buffer | string, options?: PutOptions): Promise<void> {
    return this.disk().put(key, data, options)
  }

  /**
   * Retrieves content from the specified key on the default disk.
   *
   * @param key - The path/identifier of the file to retrieve
   * @returns The file content as a Blob, or null if not found
   */
  get(key: string): Promise<Blob | null> {
    return this.disk().get(key)
  }

  /**
   * Removes a file from the default disk.
   *
   * @param key - The path/identifier of the file to delete
   * @returns True if the file was deleted, false if it didn't exist
   */
  delete(key: string): Promise<boolean> {
    return this.disk().delete(key)
  }

  /**
   * Checks if a file exists on the default disk.
   *
   * @param key - The path/identifier to check
   * @returns True if the file exists, false otherwise
   */
  exists(key: string): Promise<boolean> {
    return this.disk().exists(key)
  }

  /**
   * Creates a copy of a file on the default disk.
   *
   * @param from - The source path
   * @param to - The destination path
   * @throws {Error} If the source file does not exist or copy fails
   */
  copy(from: string, to: string): Promise<void> {
    return this.disk().copy(from, to)
  }

  /**
   * Moves or renames a file on the default disk.
   *
   * @param from - The current path
   * @param to - The new path
   * @throws {Error} If the source file does not exist or move fails
   */
  move(from: string, to: string): Promise<void> {
    return this.disk().move(from, to)
  }

  /**
   * Lists files and directories under a given prefix on the default disk.
   *
   * @param prefix - The directory or path prefix to list
   * @returns An async iterable of storage items
   * @throws {Error} If the default disk driver does not support listing
   */
  list(prefix?: string): AsyncIterable<StorageItem> {
    return this.disk().list(prefix)
  }

  /**
   * Retrieves metadata for a specific file on the default disk.
   *
   * @param key - The path/identifier of the file
   * @returns Metadata object or null if file not found
   */
  getMetadata(key: string): Promise<StorageMetadata | null> {
    return this.disk().getMetadata(key)
  }

  /**
   * Generates a public URL for a file on the default disk.
   *
   * @param key - The path/identifier of the file
   * @returns The absolute or relative URL string
   */
  getUrl(key: string): string {
    return this.disk().getUrl(key)
  }

  /**
   * Generates a temporary, signed URL for a file on the default disk.
   *
   * @param key - The path/identifier of the file
   * @param expiresIn - Expiration time in seconds
   * @returns A promise resolving to the signed URL string
   * @throws {Error} If the default disk driver does not support signed URLs
   */
  getSignedUrl(key: string, expiresIn: number): Promise<string> {
    return this.disk().getSignedUrl(key, expiresIn)
  }

  /**
   * Stores content from a readable stream on the default disk.
   *
   * 串流上傳到預設磁碟
   * Useful for handling large files without loading entire content into memory.
   *
   * @param key - The destination path
   * @param stream - Readable stream containing the data
   * @throws {Error} If the default disk driver does not support stream writing
   */
  putStream(key: string, stream: ReadableStream<Uint8Array>): Promise<void> {
    return this.disk().putStream(key, stream)
  }

  /**
   * Retrieves content as a readable stream from the default disk.
   *
   * 從預設磁碟串流讀取
   * Useful for handling large files without loading entire content into memory.
   *
   * @param key - The path/identifier of the file
   * @returns Readable stream of file content, or null if not found
   * @throws {Error} If the default disk driver does not support stream reading
   */
  getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    return this.disk().getStream(key)
  }

  /**
   * Lists files with pagination support on the default disk.
   *
   * 在預設磁碟上分頁列舉檔案
   * Recommended for large storage backends to prevent OOM.
   *
   * @param prefix - Path prefix to filter by
   * @param options - Pagination and filtering options
   * @returns Paginated list result with cursor for next page
   * @throws {Error} If the default disk driver does not support paginated listing
   */
  listPaginated(prefix: string, options?: ListOptions): Promise<ListResult> {
    return this.disk().listPaginated(prefix, options)
  }

  /**
   * Updates custom metadata for a file on the default disk.
   *
   * 更新預設磁碟上檔案的自定義 Metadata
   *
   * @param key - The path/identifier of the file
   * @param metadata - Custom metadata to set
   * @throws {Error} If the default disk driver does not support metadata updates
   */
  setMetadata(key: string, metadata: Record<string, string>): Promise<void> {
    return this.disk().setMetadata(key, metadata)
  }
}
