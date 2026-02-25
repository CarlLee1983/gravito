import { randomUUID } from 'node:crypto'
import { open, rmdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  getRuntimeAdapter,
  type RuntimeAdapter,
  runtimeMkdir,
  runtimeReadDir,
  runtimeReadText,
  runtimeRemoveRecursive,
  runtimeRename,
  runtimeStatFull,
} from '@gravito/core'
import { NativeHasher } from '@gravito/core/ffi'
import { type CacheLock, LockTimeoutError, sleep } from '../locks'
import type { CacheStore } from '../store'
import {
  type CacheKey,
  type CacheTtl,
  type CacheValue,
  isExpired,
  normalizeCacheKey,
  ttlToExpiresAt,
} from '../types'

type FileEntry = {
  expiresAt: number | null
  value: unknown
}

type LockFileEntry = {
  owner: string
  expiresAt: number
  pid: number
}

/**
 * Configuration options for the `FileStore` implementation.
 *
 * Defines how the file-based cache behaves, including storage location,
 * cleanup policies, and filesystem organization.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const options: FileStoreOptions = {
 *   directory: './cache',
 *   enableCleanup: true,
 *   maxFiles: 1000,
 *   useSubdirectories: true
 * };
 * ```
 */
export type FileStoreOptions = {
  /**
   * The absolute or relative path to the directory where cache files are stored.
   * The directory will be created automatically if it does not exist.
   */
  directory: string

  /**
   * Whether to enable the background cleanup daemon for removing expired entries.
   *
   * @default true
   */
  enableCleanup?: boolean

  /**
   * The frequency in milliseconds at which the cleanup daemon scans for expired files.
   *
   * @default 60000
   */
  cleanupInterval?: number

  /**
   * The maximum number of cache files allowed in the storage directory.
   *
   * When this limit is exceeded, the store performs LRU (Least Recently Used)
   * eviction based on file modification times.
   */
  maxFiles?: number

  /**
   * Whether to distribute cache files across nested subdirectories.
   *
   * Enabling this prevents performance degradation on filesystems with limits
   * on the number of files per single directory by using a 2-level hash-based structure.
   *
   * @default false
   */
  useSubdirectories?: boolean
}

/**
 * A persistent filesystem-based implementation of the `CacheStore` interface.
 *
 * `FileStore` manages cache entries as individual JSON files on the local disk.
 * It is designed for scenarios requiring data persistence across application
 * restarts without the overhead of external database dependencies like Redis.
 *
 * Key features:
 * - Atomic writes using temporary files and renames.
 * - Background cleanup daemon for expired entries.
 * - LRU eviction when `maxFiles` limit is reached.
 * - Optional subdirectory nesting for high-volume storage.
 * - File-based distributed locking mechanism.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const store = new FileStore({
 *   directory: './storage/cache',
 *   useSubdirectories: true
 * });
 *
 * await store.put('user:1', { name: 'John' }, 3600);
 * const user = await store.get('user:1');
 * ```
 */
export class FileStore implements CacheStore {
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private runtime: RuntimeAdapter = getRuntimeAdapter()

  /**
   * Initializes a new instance of the FileStore.
   *
   * @param options - Configuration settings for the store.
   */
  constructor(private options: FileStoreOptions) {
    if (options.enableCleanup !== false) {
      this.startCleanupDaemon(options.cleanupInterval ?? 60_000)
    }
  }

  /**
   * Starts the background process for periodic cache maintenance.
   *
   * @param interval - Time between cleanup cycles in milliseconds.
   * @internal
   */
  private startCleanupDaemon(interval: number): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanExpiredFiles().catch(() => {})
    }, interval)

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  /**
   * Scans the cache directory to remove expired files and enforce capacity limits.
   *
   * This method performs a recursive scan of the storage directory. It deletes
   * files that have passed their expiration time and, if `maxFiles` is configured,
   * evicts the oldest files to stay within the limit.
   *
   * @returns The total number of files removed during this operation.
   * @throws {Error} If the directory cannot be read or files cannot be deleted.
   *
   * @example
   * ```typescript
   * const removedCount = await store.cleanExpiredFiles();
   * console.log(`Cleaned up ${removedCount} files.`);
   * ```
   */
  async cleanExpiredFiles(): Promise<number> {
    await this.ensureDir()
    let cleaned = 0
    const validFiles: Array<{ path: string; mtime: number }> = []

    // 遞迴掃描目錄，收集過期檔案並進行 LRU 統計
    const scanDir = async (dir: string) => {
      const entries = await runtimeReadDir(this.runtime, dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory) {
          await scanDir(fullPath)
          // 掃描後嘗試移除空目錄（僅限空目錄，非遞迴）
          // rmdir 在目錄非空時會拋出錯誤，自然忽略
          try {
            await rmdir(fullPath)
          } catch {} // 非空目錄會忽略
        } else if (entry.isFile) {
          if (!entry.name.endsWith('.json') || entry.name.startsWith('.lock-')) {
            continue
          }

          try {
            const raw = await runtimeReadText(this.runtime, fullPath)
            const data = JSON.parse(raw) as FileEntry

            if (isExpired(data.expiresAt)) {
              await runtimeRemoveRecursive(this.runtime, fullPath)
              cleaned++
            } else if (this.options.maxFiles) {
              const stats = await runtimeStatFull(this.runtime, fullPath)
              validFiles.push({ path: fullPath, mtime: stats.mtimeMs })
            }
          } catch {}
        }
      }
    }

    await scanDir(this.options.directory)

    if (this.options.maxFiles && validFiles.length > this.options.maxFiles) {
      // 依最舊優先排序，超出上限的檔案進行 LRU 驅逐
      validFiles.sort((a, b) => a.mtime - b.mtime)
      const toRemove = validFiles.slice(0, validFiles.length - this.options.maxFiles)

      await Promise.all(
        toRemove.map(async (f) => {
          try {
            await runtimeRemoveRecursive(this.runtime, f.path)
            cleaned++
          } catch {}
        })
      )
    }

    return cleaned
  }

  /**
   * Stops the cleanup daemon and releases associated resources.
   *
   * Should be called when the store is no longer needed to prevent memory leaks
   * and allow the process to exit gracefully.
   *
   * @example
   * ```typescript
   * await store.destroy();
   * ```
   */
  async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Ensures that the base storage directory exists.
   *
   * @throws {Error} If the directory cannot be created due to permissions or path conflicts.
   * @internal
   */
  private async ensureDir(): Promise<void> {
    await runtimeMkdir(this.runtime, this.options.directory, { recursive: true })
  }

  /**
   * Resolves the filesystem path for a given cache key.
   *
   * @param key - Normalized cache key.
   * @returns Absolute path to the JSON file representing the key.
   * @internal
   */
  private filePathForKey(key: string): string {
    const hashed = hashKey(key)
    if (this.options.useSubdirectories) {
      // 2 層巢狀結構：ab/cd/hashedKey.json
      const d1 = hashed.substring(0, 2)
      const d2 = hashed.substring(2, 4)
      return join(this.options.directory, d1, d2, `${hashed}.json`)
    }
    return join(this.options.directory, `${hashed}.json`)
  }

  /**
   * Retrieves an item from the cache by its key.
   *
   * If the item exists but has expired, it will be deleted and `null` will be returned.
   *
   * @param key - The unique identifier for the cache item.
   * @returns The cached value, or `null` if not found or expired.
   * @throws {Error} If the file exists but cannot be read or parsed.
   *
   * @example
   * ```typescript
   * const value = await store.get<string>('my-key');
   * ```
   */
  async get<T = unknown>(key: CacheKey): Promise<CacheValue<T>> {
    const normalized = normalizeCacheKey(key)
    // 讀取前先確保根目錄存在
    await this.ensureDir()
    const file = this.filePathForKey(normalized)

    try {
      const raw = await runtimeReadText(this.runtime, file)
      const data = JSON.parse(raw) as FileEntry
      if (isExpired(data.expiresAt)) {
        await this.forget(normalized)
        return null
      }
      return data.value as T
    } catch {
      return null
    }
  }

  /**
   * Stores an item in the cache with a specified expiration time.
   *
   * Uses an atomic write strategy (write to temp file then rename) to ensure
   * data integrity even if the process crashes during the write operation.
   *
   * @param key - The unique identifier for the cache item.
   * @param value - The data to be cached.
   * @param ttl - Time-to-live in seconds or a Date object for absolute expiration.
   * @throws {Error} If the file system is not writable or disk is full.
   *
   * @example
   * ```typescript
   * await store.put('settings', { theme: 'dark' }, 86400);
   * ```
   */
  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    const normalized = normalizeCacheKey(key)
    await this.ensureDir()
    const expiresAt = ttlToExpiresAt(ttl)
    if (expiresAt !== null && expiresAt !== undefined && expiresAt <= Date.now()) {
      await this.forget(normalized)
      return
    }

    const file = this.filePathForKey(normalized)

    if (this.options.useSubdirectories) {
      await runtimeMkdir(this.runtime, dirname(file), { recursive: true })
    }

    const tempFile = `${file}.tmp.${Date.now()}.${randomUUID()}`
    const payload: FileEntry = { expiresAt: expiresAt ?? null, value }

    try {
      // 原子寫入：先寫入暫存檔，再重新命名至目標路徑
      await this.runtime.writeFile(tempFile, JSON.stringify(payload))
      await runtimeRename(this.runtime, tempFile, file)
    } catch (error) {
      await runtimeRemoveRecursive(this.runtime, tempFile).catch(() => {})
      throw error
    }
  }

  /**
   * Stores an item in the cache only if it does not already exist.
   *
   * @param key - The unique identifier for the cache item.
   * @param value - The data to be cached.
   * @param ttl - Time-to-live in seconds or a Date object.
   * @returns `true` if the item was stored, `false` if it already existed.
   *
   * @example
   * ```typescript
   * const success = await store.add('unique-task', { status: 'pending' }, 60);
   * ```
   */
  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    const normalized = normalizeCacheKey(key)
    const existing = await this.get(normalized)
    if (existing !== null) {
      return false
    }
    await this.put(normalized, value, ttl)
    return true
  }

  /**
   * Removes an item from the cache by its key.
   *
   * @param key - The unique identifier for the cache item.
   * @returns `true` if the file was deleted or didn't exist, `false` on failure.
   *
   * @example
   * ```typescript
   * await store.forget('my-key');
   * ```
   */
  async forget(key: CacheKey): Promise<boolean> {
    const normalized = normalizeCacheKey(key)
    await this.ensureDir()
    const file = this.filePathForKey(normalized)
    try {
      await runtimeRemoveRecursive(this.runtime, file)
      return true
    } catch {
      return false
    }
  }

  /**
   * Removes all items from the cache directory.
   *
   * This operation deletes the entire cache directory and recreates it.
   * Use with caution as it is destructive and non-reversible.
   *
   * @throws {Error} If the directory cannot be removed or recreated.
   *
   * @example
   * ```typescript
   * await store.flush();
   * ```
   */
  async flush(): Promise<void> {
    await this.ensureDir()
    // 移除整個快取目錄並重新建立
    await runtimeRemoveRecursive(this.runtime, this.options.directory)
    await this.ensureDir()
  }

  /**
   * Increments the value of an integer item in the cache.
   *
   * If the key does not exist, it is initialized to 0 before incrementing.
   *
   * @param key - The unique identifier for the cache item.
   * @param value - The amount to increment by.
   * @returns The new value after incrementing.
   * @throws {Error} If the existing value is not a number.
   *
   * @example
   * ```typescript
   * const newCount = await store.increment('page-views');
   * ```
   */
  async increment(key: CacheKey, value = 1): Promise<number> {
    const normalized = normalizeCacheKey(key)
    const current = await this.get<number>(normalized)
    const next = (current ?? 0) + value
    await this.put(normalized, next, null)
    return next
  }

  /**
   * Decrements the value of an integer item in the cache.
   *
   * If the key does not exist, it is initialized to 0 before decrementing.
   *
   * @param key - The unique identifier for the cache item.
   * @param value - The amount to decrement by.
   * @returns The new value after decrementing.
   * @throws {Error} If the existing value is not a number.
   *
   * @example
   * ```typescript
   * const newCount = await store.decrement('stock-level');
   * ```
   */
  async decrement(key: CacheKey, value = 1): Promise<number> {
    return this.increment(key, -value)
  }

  /**
   * Retrieves the remaining time-to-live for a cache item in seconds.
   *
   * @param key - The unique identifier for the cache item.
   * @returns The seconds remaining until expiration, or `null` if it never expires or doesn't exist.
   *
   * @example
   * ```typescript
   * const secondsLeft = await store.ttl('session:123');
   * ```
   */
  async ttl(key: CacheKey): Promise<number | null> {
    const normalized = normalizeCacheKey(key)
    const file = this.filePathForKey(normalized)

    try {
      const raw = await runtimeReadText(this.runtime, file)
      const data = JSON.parse(raw) as FileEntry

      if (data.expiresAt === null) {
        return null
      }

      const remaining = Math.ceil((data.expiresAt - Date.now()) / 1000)
      return remaining > 0 ? remaining : null
    } catch {
      return null
    }
  }

  /**
   * Creates a distributed lock instance based on the filesystem.
   *
   * Locks are implemented using atomic file creation (`wx` flag). They include
   * protection against stale locks by checking process IDs and expiration times.
   *
   * @param name - The unique name of the lock.
   * @param seconds - The duration in seconds for which the lock should be held.
   * @returns A `CacheLock` instance for managing the lock lifecycle.
   *
   * @example
   * ```typescript
   * const lock = store.lock('process-report', 60);
   * if (await lock.acquire()) {
   *   try {
   *     // Critical section
   *   } finally {
   *     await lock.release();
   *   }
   * }
   * ```
   */
  lock(name: string, seconds = 10): CacheLock {
    const normalizedName = normalizeCacheKey(name)
    const lockFile = join(this.options.directory, `.lock-${hashKey(normalizedName)}`)
    const ttlMillis = Math.max(1, seconds) * 1000
    const owner = randomUUID()
    // 保留 RuntimeAdapter 參照以供 lock 內部使用
    const runtime = this.runtime

    const isProcessAlive = (pid: number): boolean => {
      try {
        process.kill(pid, 0)
        return true
      } catch {
        return false
      }
    }

    const tryAcquire = async (): Promise<boolean> => {
      await this.ensureDir()
      try {
        // 使用 node:fs/promises open(flag='wx') 實現原子性建鎖（POSIX 語義）
        // RuntimeAdapter 尚未提供 exclusive create 語義，因此保留此用法
        const handle = await open(lockFile, 'wx')
        const lockData: LockFileEntry = {
          owner,
          expiresAt: Date.now() + ttlMillis,
          pid: process.pid,
        }
        await handle.writeFile(JSON.stringify(lockData), 'utf8')
        await handle.close()
        return true
      } catch {
        try {
          const raw = await runtimeReadText(runtime, lockFile)
          const data = JSON.parse(raw) as LockFileEntry

          const isExpiredLock = !data.expiresAt || Date.now() > data.expiresAt
          const isProcessDead = data.pid && !isProcessAlive(data.pid)

          if (isExpiredLock || isProcessDead) {
            await runtimeRemoveRecursive(runtime, lockFile)
          }
        } catch {}
        return false
      }
    }

    return {
      /**
       * Attempts to acquire the lock immediately.
       *
       * @returns `true` if the lock was successfully acquired, `false` otherwise.
       */
      async acquire(): Promise<boolean> {
        return tryAcquire()
      },

      /**
       * Releases the lock if it is owned by the current instance.
       */
      async release(): Promise<void> {
        try {
          const raw = await runtimeReadText(runtime, lockFile)
          const data = JSON.parse(raw) as LockFileEntry
          if (data.owner === owner) {
            await runtimeRemoveRecursive(runtime, lockFile)
          }
        } catch {}
      },

      /**
       * Executes a callback within the lock, waiting if necessary.
       *
       * @param secondsToWait - Maximum time to wait for the lock in seconds.
       * @param callback - The function to execute once the lock is acquired.
       * @param options - Polling configuration.
       * @returns The result of the callback.
       * @throws {LockTimeoutError} If the lock cannot be acquired within the wait time.
       */
      async block<T>(
        secondsToWait: number,
        callback: () => Promise<T> | T,
        options?: { sleepMillis?: number }
      ): Promise<T> {
        const deadline = Date.now() + Math.max(0, secondsToWait) * 1000
        const sleepMillis = options?.sleepMillis ?? 150

        while (Date.now() <= deadline) {
          if (await this.acquire()) {
            try {
              return await callback()
            } finally {
              await this.release()
            }
          }
          await sleep(sleepMillis)
        }

        throw new LockTimeoutError(
          `Failed to acquire lock '${name}' within ${secondsToWait} seconds.`
        )
      },
    }
  }
}

/**
 * Generates a SHA-256 hash of a string key.
 *
 * Used to create safe filenames and subdirectory structures.
 *
 * @param key - String to hash.
 * @returns Hex-encoded SHA-256 hash.
 * @internal
 *
 * @example
 * ```typescript
 * const hash = hashKey('my-secret-key');
 * ```
 */
function hashKey(key: string): string {
  return NativeHasher.sha256(key)
}
