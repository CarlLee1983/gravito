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
  runtimeWriteFileExclusive,
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
 */
export type FileStoreOptions = {
  directory: string
  enableCleanup?: boolean
  cleanupInterval?: number
  maxFiles?: number
  useSubdirectories?: boolean
}

/**
 * A persistent filesystem-based implementation of the `CacheStore` interface.
 */
export class FileStore implements CacheStore {
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private runtime: RuntimeAdapter = getRuntimeAdapter()

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
    let cleaned = 0
    const validFiles: Array<{ path: string; mtime: number }> = []

    const scanDir = async (dir: string) => {
      const entries = await runtimeReadDir(this.runtime, dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory) {
          await scanDir(fullPath)
          try {
            const { rmdir } = await import('node:fs/promises')
            await rmdir(fullPath)
          } catch {}
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

  async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  private async ensureDir(): Promise<void> {
    await runtimeMkdir(this.runtime, this.options.directory, { recursive: true })
  }

  private async filePathForKey(key: string): Promise<string> {
    const hashed = hashKey(key)
    if (this.options.useSubdirectories) {
      const d1 = hashed.substring(0, 2)
      const d2 = hashed.substring(2, 4)
      return join(this.options.directory, d1, d2, `${hashed}.json`)
    }
    return join(this.options.directory, `${hashed}.json`)
  }

  async get<T = unknown>(key: CacheKey): Promise<CacheValue<T>> {
    const normalized = normalizeCacheKey(key)
    await this.ensureDir()
    const file = await this.filePathForKey(normalized)

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

  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    const normalized = normalizeCacheKey(key)
    await this.ensureDir()
    const expiresAt = ttlToExpiresAt(ttl)
    if (expiresAt !== null && expiresAt !== undefined && expiresAt <= Date.now()) {
      await this.forget(normalized)
      return
    }

    const file = await this.filePathForKey(normalized)

    if (this.options.useSubdirectories) {
      await runtimeMkdir(this.runtime, dirname(file), { recursive: true })
    }

    const tempFile = `${file}.tmp.${Date.now()}.${crypto.randomUUID()}`
    const payload: FileEntry = { expiresAt: expiresAt ?? null, value }

    try {
      await this.runtime.writeFile(tempFile, JSON.stringify(payload))
      await runtimeRename(this.runtime, tempFile, file)
    } catch (error) {
      await runtimeRemoveRecursive(this.runtime, tempFile).catch(() => {})
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
    const file = await this.filePathForKey(normalized)
    try {
      await runtimeRemoveRecursive(this.runtime, file)
      return true
    } catch {
      return false
    }
  }

  async flush(): Promise<void> {
    await this.ensureDir()
    await runtimeRemoveRecursive(this.runtime, this.options.directory)
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
    const file = await this.filePathForKey(normalized)

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

  lock(name: string, seconds = 10): CacheLock {
    const normalizedName = normalizeCacheKey(name)
    const lockFile = join(this.options.directory, `.lock-${syncHashKey(normalizedName)}`)
    const ttlMillis = Math.max(1, seconds) * 1000
    const owner = crypto.randomUUID()
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
        const lockData: LockFileEntry = {
          owner,
          expiresAt: Date.now() + ttlMillis,
          pid: process.pid,
        }
        await runtimeWriteFileExclusive(runtime, lockFile, JSON.stringify(lockData))
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
      async acquire(): Promise<boolean> {
        return tryAcquire()
      },
      async release(): Promise<void> {
        try {
          const raw = await runtimeReadText(runtime, lockFile)
          const data = JSON.parse(raw) as LockFileEntry
          if (data.owner === owner) {
            await runtimeRemoveRecursive(runtime, lockFile)
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
  return NativeHasher.sha256(key)
}

function syncHashKey(key: string): string {
  let hash = 5381
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
