import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
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
  /** Maximum number of cache files before triggering cleanup (default: unlimited) */
  maxFiles?: number
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

  async cleanExpiredFiles(): Promise<number> {
    await this.ensureDir()
    const files = await readdir(this.options.directory)
    let cleaned = 0

    for (const file of files) {
      if (!file.endsWith('.json') || file.startsWith('.lock-')) {
        continue
      }

      try {
        const filePath = join(this.options.directory, file)
        const raw = await readFile(filePath, 'utf8')
        const data = JSON.parse(raw) as FileEntry

        if (isExpired(data.expiresAt)) {
          await rm(filePath, { force: true })
          cleaned++
        }
      } catch {}
    }

    return cleaned
  }

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
    return join(this.options.directory, `${hashed}.json`)
  }

  async get<T = unknown>(key: CacheKey): Promise<CacheValue<T>> {
    const normalized = normalizeCacheKey(key)
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
    const files = await readdir(this.options.directory)
    await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map((f) => rm(join(this.options.directory, f), { force: true }))
    )
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
