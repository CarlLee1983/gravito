import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
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
 * Options for configuring the `FileStore`.
 *
 * @public
 * @since 3.0.0
 */
export type FileStoreOptions = {
  /** The directory where cache files will be stored. */
  directory: string
  /** Enable automatic cleanup of expired files (default: true) */
  enableCleanup?: boolean
  /** Cleanup interval in milliseconds (default: 60000) */
  cleanupInterval?: number
  /**
   * Maximum number of cache files allowed in the directory.
   * When the limit is reached, the oldest files are evicted (LRU).
   */
  maxFiles?: number
  /**
   * Enable hashed subdirectories (e.g., `ab/cd/hash.json`) to avoid
   * filesystem limits on the number of files per directory.
   * @default false
   */
  useSubdirectories?: boolean
}

/**
 * FileStore implements the `CacheStore` interface using the local file system.
 *
 * It stores cache entries as individual JSON files in the specified directory.
 * While not as fast as memory or Redis, it provides persistent caching across
 * application restarts without external dependencies.
 *
 * @public
 * @since 3.0.0
 */
export class FileStore implements CacheStore {
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(private options: FileStoreOptions) {
    if (options.enableCleanup !== false) {
      this.startCleanupDaemon(options.cleanupInterval ?? 60_000)
    }
  }

  private startCleanupDaemon(interval: number): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanExpiredFiles().catch(() => {})
    }, interval)

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  /**
   * Clean up expired cache files and enforce the `maxFiles` limit.
   *
   * @returns A promise that resolves to the number of files cleaned up.
   */
  async cleanExpiredFiles(): Promise<number> {
    await this.ensureDir()
    let cleaned = 0
    const validFiles: Array<{ path: string; mtime: number }> = []

    // Helper to recursively scan directories
    const scanDir = async (dir: string) => {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          await scanDir(fullPath)
          // Try to remove empty directories after scanning
          try {
            await rm(fullPath, { recursive: false })
          } catch {} // Ignore if not empty
        } else if (entry.isFile()) {
          if (!entry.name.endsWith('.json') || entry.name.startsWith('.lock-')) {
            continue
          }

          try {
            const raw = await readFile(fullPath, 'utf8')
            const data = JSON.parse(raw) as FileEntry

            if (isExpired(data.expiresAt)) {
              await rm(fullPath, { force: true })
              cleaned++
            } else if (this.options.maxFiles) {
              const stats = await stat(fullPath)
              validFiles.push({ path: fullPath, mtime: stats.mtimeMs })
            }
          } catch {}
        }
      }
    }

    await scanDir(this.options.directory)

    if (this.options.maxFiles && validFiles.length > this.options.maxFiles) {
      // Sort by oldest first
      validFiles.sort((a, b) => a.mtime - b.mtime)
      const toRemove = validFiles.slice(0, validFiles.length - this.options.maxFiles)

      await Promise.all(
        toRemove.map(async (f) => {
          try {
            await rm(f.path, { force: true })
            cleaned++
          } catch {}
        })
      )
    }

    return cleaned
  }

  /**
   * Clean up resources and stop the cleanup daemon.
   */
  async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  private async ensureDir(): Promise<void> {
    await mkdir(this.options.directory, { recursive: true })
  }

  private filePathForKey(key: string): string {
    const hashed = hashKey(key)
    if (this.options.useSubdirectories) {
      // 2-level nesting: ab/cd/hashedKey.json
      const d1 = hashed.substring(0, 2)
      const d2 = hashed.substring(2, 4)
      return join(this.options.directory, d1, d2, `${hashed}.json`)
    }
    return join(this.options.directory, `${hashed}.json`)
  }

  async get<T = unknown>(key: CacheKey): Promise<CacheValue<T>> {
    const normalized = normalizeCacheKey(key)
    // For reads, we don't ensure dir existence recursively if it doesn't exist.
    // However, if we use hashed dirs, we might need to know if the file path is valid.
    // The previous implementation called ensureDir() on get, which ensures root exists.
    // We can keep that.
    await this.ensureDir()
    const file = this.filePathForKey(normalized)

    try {
      const raw = await readFile(file, 'utf8')
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
      await mkdir(dirname(file), { recursive: true })
    }

    const tempFile = `${file}.tmp.${Date.now()}.${randomUUID()}`
    const payload: FileEntry = { expiresAt: expiresAt ?? null, value }

    try {
      await writeFile(tempFile, JSON.stringify(payload), 'utf8')
      await rename(tempFile, file)
    } catch (error) {
      await rm(tempFile, { force: true }).catch(() => {})
      throw error
    }
  }

  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    const normalized = normalizeCacheKey(key)
    const existing = await this.get(normalized)
    if (existing !== null) {
      return false
    }
    await this.put(normalized, value, ttl)
    return true
  }

  async forget(key: CacheKey): Promise<boolean> {
    const normalized = normalizeCacheKey(key)
    await this.ensureDir()
    const file = this.filePathForKey(normalized)
    try {
      await rm(file, { force: true })
      return true
    } catch {
      return false
    }
  }

  async flush(): Promise<void> {
    await this.ensureDir()
    // For flush, we just remove everything in the directory and recreate it
    // This handles both flat and recursive structures
    await rm(this.options.directory, { recursive: true, force: true })
    await this.ensureDir()
  }

  async increment(key: CacheKey, value = 1): Promise<number> {
    const normalized = normalizeCacheKey(key)
    const current = await this.get<number>(normalized)
    const next = (current ?? 0) + value
    await this.put(normalized, next, null)
    return next
  }

  async decrement(key: CacheKey, value = 1): Promise<number> {
    return this.increment(key, -value)
  }

  async ttl(key: CacheKey): Promise<number | null> {
    const normalized = normalizeCacheKey(key)
    const file = this.filePathForKey(normalized)

    try {
      const raw = await readFile(file, 'utf8')
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

  lock(name: string, seconds = 10): CacheLock {
    const normalizedName = normalizeCacheKey(name)
    const lockFile = join(this.options.directory, `.lock-${hashKey(normalizedName)}`)
    const ttlMillis = Math.max(1, seconds) * 1000
    const owner = randomUUID()

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
          const raw = await readFile(lockFile, 'utf8')
          const data = JSON.parse(raw) as LockFileEntry

          const isExpired = !data.expiresAt || Date.now() > data.expiresAt
          const isProcessDead = data.pid && !isProcessAlive(data.pid)

          if (isExpired || isProcessDead) {
            await rm(lockFile, { force: true })
          }
        } catch {}
        return false
      }
    }

    return {
      async acquire(): Promise<boolean> {
        return tryAcquire()
      },

      async release(): Promise<void> {
        try {
          const raw = await readFile(lockFile, 'utf8')
          const data = JSON.parse(raw) as LockFileEntry
          if (data.owner === owner) {
            await rm(lockFile, { force: true })
          }
        } catch {}
      },

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

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}
