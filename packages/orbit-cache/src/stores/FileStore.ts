import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type CacheLock, LockTimeoutError, sleep } from '../locks';
import type { CacheStore } from '../store';
import {
  type CacheKey,
  type CacheTtl,
  type CacheValue,
  isExpired,
  normalizeCacheKey,
  ttlToExpiresAt,
} from '../types';

type FileEntry = {
  expiresAt: number | null;
  value: unknown;
};

export type FileStoreOptions = {
  directory: string;
};

function hashKey(key: string): string {
  return createHash('sha1').update(key).digest('hex');
}

export class FileStore implements CacheStore {
  constructor(private options: FileStoreOptions) {}

  private async ensureDir(): Promise<void> {
    await mkdir(this.options.directory, { recursive: true });
  }

  private filePathForKey(key: string): string {
    const hashed = hashKey(key);
    return join(this.options.directory, `${hashed}.json`);
  }

  async get<T = unknown>(key: CacheKey): Promise<CacheValue<T>> {
    const normalized = normalizeCacheKey(key);
    await this.ensureDir();
    const file = this.filePathForKey(normalized);

    try {
      const raw = await readFile(file, 'utf8');
      const data = JSON.parse(raw) as FileEntry;
      if (isExpired(data.expiresAt)) {
        await this.forget(normalized);
        return null;
      }
      return data.value as T;
    } catch {
      return null;
    }
  }

  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    const normalized = normalizeCacheKey(key);
    await this.ensureDir();
    const expiresAt = ttlToExpiresAt(ttl);
    if (expiresAt !== null && expiresAt !== undefined && expiresAt <= Date.now()) {
      await this.forget(normalized);
      return;
    }

    const file = this.filePathForKey(normalized);
    const payload: FileEntry = { expiresAt: expiresAt ?? null, value };
    await writeFile(file, JSON.stringify(payload), 'utf8');
  }

  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    const normalized = normalizeCacheKey(key);
    const existing = await this.get(normalized);
    if (existing !== null) {
      return false;
    }
    await this.put(normalized, value, ttl);
    return true;
  }

  async forget(key: CacheKey): Promise<boolean> {
    const normalized = normalizeCacheKey(key);
    await this.ensureDir();
    const file = this.filePathForKey(normalized);
    try {
      await rm(file, { force: true });
      return true;
    } catch {
      return false;
    }
  }

  async flush(): Promise<void> {
    await this.ensureDir();
    const files = await readdir(this.options.directory);
    await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map((f) => rm(join(this.options.directory, f), { force: true }))
    );
  }

  async increment(key: CacheKey, value = 1): Promise<number> {
    const normalized = normalizeCacheKey(key);
    const current = await this.get<number>(normalized);
    const next = (current ?? 0) + value;
    await this.put(normalized, next, null);
    return next;
  }

  async decrement(key: CacheKey, value = 1): Promise<number> {
    return this.increment(key, -value);
  }

  lock(name: string, seconds = 10): CacheLock {
    const normalizedName = normalizeCacheKey(name);
    const lockFile = join(this.options.directory, `.lock-${hashKey(normalizedName)}`);
    const ttlMillis = Math.max(1, seconds) * 1000;
    const owner = randomUUID();

    const tryAcquire = async (): Promise<boolean> => {
      await this.ensureDir();
      try {
        const handle = await open(lockFile, 'wx');
        await handle.writeFile(
          JSON.stringify({ owner, expiresAt: Date.now() + ttlMillis }),
          'utf8'
        );
        await handle.close();
        return true;
      } catch {
        // If lock exists, attempt stale cleanup
        try {
          const raw = await readFile(lockFile, 'utf8');
          const data = JSON.parse(raw) as { owner?: string; expiresAt?: number };
          if (!data.expiresAt || Date.now() > data.expiresAt) {
            await rm(lockFile, { force: true });
            return false;
          }
        } catch {
          // ignore
        }
        return false;
      }
    };

    return {
      async acquire(): Promise<boolean> {
        return tryAcquire();
      },

      async release(): Promise<void> {
        try {
          const raw = await readFile(lockFile, 'utf8');
          const data = JSON.parse(raw) as { owner?: string };
          if (data.owner === owner) {
            await rm(lockFile, { force: true });
          }
        } catch {
          // ignore
        }
      },

      async block<T>(
        secondsToWait: number,
        callback: () => Promise<T> | T,
        options?: { sleepMillis?: number }
      ): Promise<T> {
        const deadline = Date.now() + Math.max(0, secondsToWait) * 1000;
        const sleepMillis = options?.sleepMillis ?? 150;

        while (Date.now() <= deadline) {
          if (await this.acquire()) {
            try {
              return await callback();
            } finally {
              await this.release();
            }
          }
          await sleep(sleepMillis);
        }

        throw new LockTimeoutError(
          `Failed to acquire lock '${name}' within ${secondsToWait} seconds.`
        );
      },
    };
  }
}
