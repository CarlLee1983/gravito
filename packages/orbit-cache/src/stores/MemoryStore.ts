import { randomUUID } from 'node:crypto';
import { type CacheLock, LockTimeoutError, sleep } from '../locks';
import type { CacheStore, TaggableStore } from '../store';
import {
  type CacheKey,
  type CacheTtl,
  type CacheValue,
  isExpired,
  normalizeCacheKey,
  ttlToExpiresAt,
} from '../types';

type Entry = {
  value: unknown;
  expiresAt: number | null;
};

type LockEntry = {
  owner: string;
  expiresAt: number;
};

export type MemoryStoreOptions = {
  maxItems?: number;
};

export class MemoryStore implements CacheStore, TaggableStore {
  private entries = new Map<string, Entry>();
  private locks = new Map<string, LockEntry>();

  private tagToKeys = new Map<string, Set<string>>();
  private keyToTags = new Map<string, Set<string>>();

  constructor(private options: MemoryStoreOptions = {}) {}

  private touchLRU(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) {
      return;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
  }

  private pruneIfNeeded(): void {
    const maxItems = this.options.maxItems;
    if (!maxItems || maxItems <= 0) {
      return;
    }
    while (this.entries.size > maxItems) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) {
        return;
      }
      void this.forget(oldest);
    }
  }

  private cleanupExpired(key: string, now = Date.now()): void {
    const entry = this.entries.get(key);
    if (!entry) {
      return;
    }
    if (isExpired(entry.expiresAt, now)) {
      void this.forget(key);
    }
  }

  async get<T = unknown>(key: CacheKey): Promise<CacheValue<T>> {
    const normalized = normalizeCacheKey(key);
    const entry = this.entries.get(normalized);
    if (!entry) {
      return null;
    }

    if (isExpired(entry.expiresAt)) {
      await this.forget(normalized);
      return null;
    }

    this.touchLRU(normalized);
    return entry.value as T;
  }

  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    const normalized = normalizeCacheKey(key);
    const expiresAt = ttlToExpiresAt(ttl);
    if (expiresAt !== null && expiresAt !== undefined && expiresAt <= Date.now()) {
      await this.forget(normalized);
      return;
    }

    this.entries.set(normalized, { value, expiresAt: expiresAt ?? null });
    this.pruneIfNeeded();
  }

  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    const normalized = normalizeCacheKey(key);
    this.cleanupExpired(normalized);
    if (this.entries.has(normalized)) {
      return false;
    }
    await this.put(normalized, value, ttl);
    return true;
  }

  async forget(key: CacheKey): Promise<boolean> {
    const normalized = normalizeCacheKey(key);
    const existed = this.entries.delete(normalized);
    this.tagIndexRemove(normalized);
    return existed;
  }

  async flush(): Promise<void> {
    this.entries.clear();
    this.tagToKeys.clear();
    this.keyToTags.clear();
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
    const lockKey = `lock:${normalizeCacheKey(name)}`;
    const ttlMillis = Math.max(1, seconds) * 1000;
    const locks = this.locks;

    const acquire = async (): Promise<{ ok: boolean; owner?: string }> => {
      const now = Date.now();
      const existing = locks.get(lockKey);
      if (existing && existing.expiresAt > now) {
        return { ok: false };
      }

      const owner = randomUUID();
      locks.set(lockKey, { owner, expiresAt: now + ttlMillis });
      return { ok: true, owner };
    };

    let owner: string | undefined;

    return {
      async acquire(): Promise<boolean> {
        const result = await acquire();
        if (!result.ok) {
          return false;
        }
        owner = result.owner;
        return true;
      },

      async release(): Promise<void> {
        if (!owner) {
          return;
        }
        const existing = locks.get(lockKey);
        if (existing?.owner === owner) {
          locks.delete(lockKey);
        }
        owner = undefined;
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

  tagKey(key: string, tags: readonly string[]): string {
    const normalizedKey = normalizeCacheKey(key);
    const normalizedTags = [...tags].map(String).filter(Boolean).sort();
    if (normalizedTags.length === 0) {
      return normalizedKey;
    }
    return `tags:${normalizedTags.join('|')}:${normalizedKey}`;
  }

  tagIndexAdd(tags: readonly string[], taggedKey: string): void {
    const normalizedTags = [...tags].map(String).filter(Boolean);
    if (normalizedTags.length === 0) {
      return;
    }

    for (const tag of normalizedTags) {
      let keys = this.tagToKeys.get(tag);
      if (!keys) {
        keys = new Set<string>();
        this.tagToKeys.set(tag, keys);
      }
      keys.add(taggedKey);
    }

    let tagSet = this.keyToTags.get(taggedKey);
    if (!tagSet) {
      tagSet = new Set<string>();
      this.keyToTags.set(taggedKey, tagSet);
    }
    for (const tag of normalizedTags) {
      tagSet.add(tag);
    }
  }

  tagIndexRemove(taggedKey: string): void {
    const tags = this.keyToTags.get(taggedKey);
    if (!tags) {
      return;
    }

    for (const tag of tags) {
      const keys = this.tagToKeys.get(tag);
      if (!keys) {
        continue;
      }
      keys.delete(taggedKey);
      if (keys.size === 0) {
        this.tagToKeys.delete(tag);
      }
    }

    this.keyToTags.delete(taggedKey);
  }

  async flushTags(tags: readonly string[]): Promise<void> {
    const normalizedTags = [...tags].map(String).filter(Boolean);
    if (normalizedTags.length === 0) {
      return;
    }

    const keysToDelete = new Set<string>();
    for (const tag of normalizedTags) {
      const keys = this.tagToKeys.get(tag);
      if (!keys) {
        continue;
      }
      for (const k of keys) {
        keysToDelete.add(k);
      }
    }

    for (const key of keysToDelete) {
      await this.forget(key);
    }
  }
}
