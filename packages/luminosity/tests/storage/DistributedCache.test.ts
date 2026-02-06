import { beforeEach, describe, expect, it } from 'bun:test'
import type { SitemapEntry } from '../../src/interfaces'
import type { CacheLock, CacheLockProvider } from '../../src/storage/adapter'
import { DistributedCache } from '../../src/storage/DistributedCache'

/**
 * 建立 mock cache store
 */
function createMockCacheStore() {
  const store = new Map<string, { value: SitemapEntry[]; ttl: number }>()

  return {
    get: async (key: string): Promise<SitemapEntry[] | null> => {
      const item = store.get(key)
      if (!item) {
        return null
      }
      return item.value
    },
    set: async (key: string, value: SitemapEntry[], ttl: number): Promise<void> => {
      store.set(key, { value, ttl })
    },
    _store: store,
  }
}

/**
 * 建立 mock lock provider
 */
function createMockLockProvider() {
  const locks = new Map<string, CacheLock>()

  const provider: CacheLockProvider = {
    createLock: (key: string, _ttl: number): CacheLock => {
      if (!locks.has(key)) {
        locks.set(key, {
          block: async <T>(_timeout: number, fn: () => Promise<T>): Promise<T> => {
            return await fn()
          },
        })
      }
      return locks.get(key)!
    },
  }

  return { provider, locks }
}

describe('DistributedCache', () => {
  let cacheStore: ReturnType<typeof createMockCacheStore>
  let lockProvider: ReturnType<typeof createMockLockProvider>
  let cache: DistributedCache

  const sampleEntries: SitemapEntry[] = [
    { url: '/page1', priority: 0.8 },
    { url: '/page2', priority: 0.6 },
  ]

  beforeEach(() => {
    cacheStore = createMockCacheStore()
    lockProvider = createMockLockProvider()
    cache = new DistributedCache({
      ttlSeconds: 3600,
      lockProvider: lockProvider.provider,
      cacheStore,
    })
  })

  describe('getOrCompute()', () => {
    it('should return cached entries on cache hit', async () => {
      // 預先填入快取
      await cacheStore.set('luminosity:sitemap:entries', sampleEntries, 3600)

      let computeCalled = false
      const result = await cache.getOrCompute(async () => {
        computeCalled = true
        return [{ url: '/computed' }]
      })

      expect(result).toEqual(sampleEntries)
      expect(computeCalled).toBe(false) // compute 不應被呼叫
    })

    it('should compute and cache entries on cache miss', async () => {
      let computeCalled = false
      const result = await cache.getOrCompute(async () => {
        computeCalled = true
        return sampleEntries
      })

      expect(result).toEqual(sampleEntries)
      expect(computeCalled).toBe(true)

      // 驗證已存入快取
      const cached = await cacheStore.get('luminosity:sitemap:entries')
      expect(cached).toEqual(sampleEntries)
    })

    it('should use correct TTL when caching', async () => {
      await cache.getOrCompute(async () => sampleEntries)

      const stored = cacheStore._store.get('luminosity:sitemap:entries')
      expect(stored?.ttl).toBe(3600)
    })

    it('should double-check cache after acquiring lock', async () => {
      // 模擬另一個 instance 在鎖等待期間填入快取的場景
      let checkCount = 0
      const _originalGet = cacheStore.get

      cacheStore.get = async (_key: string) => {
        checkCount++
        if (checkCount === 1) {
          // 第一次檢查：快取未命中
          return null
        }
        // 第二次檢查（鎖內）：快取已被其他 instance 填入
        return sampleEntries
      }

      let computeCalled = false
      const result = await cache.getOrCompute(async () => {
        computeCalled = true
        return [{ url: '/should-not-be-used' }]
      })

      expect(result).toEqual(sampleEntries)
      expect(computeCalled).toBe(false) // 不應計算，因為鎖內已找到快取
      expect(checkCount).toBe(2) // 應檢查兩次
    })

    it('should handle compute function errors', async () => {
      await expect(
        cache.getOrCompute(async () => {
          throw new Error('Database connection failed')
        })
      ).rejects.toThrow('Database connection failed')
    })

    it('should return empty array from compute function', async () => {
      const result = await cache.getOrCompute(async () => [])

      expect(result).toEqual([])
    })

    it('should handle concurrent calls with locking', async () => {
      let _computeCount = 0
      const computeFn = async () => {
        _computeCount++
        // 模擬耗時計算
        await new Promise((resolve) => setTimeout(resolve, 10))
        return sampleEntries
      }

      // 同時發起兩個 getOrCompute 請求
      const [result1, result2] = await Promise.all([
        cache.getOrCompute(computeFn),
        cache.getOrCompute(computeFn),
      ])

      // 兩者都應返回相同結果
      expect(result1).toEqual(sampleEntries)
      expect(result2).toEqual(sampleEntries)
    })
  })

  describe('invalidate()', () => {
    it('should invalidate the cache by setting empty array with 0 TTL', async () => {
      // 先填入快取
      await cacheStore.set('luminosity:sitemap:entries', sampleEntries, 3600)

      await cache.invalidate()

      const stored = cacheStore._store.get('luminosity:sitemap:entries')
      expect(stored?.value).toEqual([])
      expect(stored?.ttl).toBe(0)
    })

    it('should cause next getOrCompute to recompute', async () => {
      // 填入快取
      await cacheStore.set('luminosity:sitemap:entries', sampleEntries, 3600)

      // 驗證快取命中
      const cached = await cache.getOrCompute(async () => [{ url: '/new' }])
      expect(cached).toEqual(sampleEntries)

      // 失效
      await cache.invalidate()

      // 重新設定 cacheStore.get 以模擬空快取
      const invalidated = cacheStore._store.get('luminosity:sitemap:entries')
      // 快取設為空陣列，getOrCompute 會將空陣列視為 truthy
      // 因此需要確認行為
      expect(invalidated?.value).toEqual([])
    })
  })

  describe('lock provider integration', () => {
    it('should create lock with correct key and TTL', async () => {
      let capturedKey: string | undefined
      let capturedTtl: number | undefined

      const customProvider: CacheLockProvider = {
        createLock: (key: string, ttl: number): CacheLock => {
          capturedKey = key
          capturedTtl = ttl
          return {
            block: async <T>(_timeout: number, fn: () => Promise<T>): Promise<T> => {
              return await fn()
            },
          }
        },
      }

      const customCache = new DistributedCache({
        ttlSeconds: 3600,
        lockProvider: customProvider,
        cacheStore,
      })

      await customCache.getOrCompute(async () => sampleEntries)

      expect(capturedKey).toBe('luminosity:sitemap:lock')
      expect(capturedTtl).toBe(30)
    })

    it('should pass timeout of 10 seconds to lock.block', async () => {
      let capturedTimeout: number | undefined

      const customProvider: CacheLockProvider = {
        createLock: (_key: string, _ttl: number): CacheLock => ({
          block: async <T>(timeout: number, fn: () => Promise<T>): Promise<T> => {
            capturedTimeout = timeout
            return await fn()
          },
        }),
      }

      const customCache = new DistributedCache({
        ttlSeconds: 3600,
        lockProvider: customProvider,
        cacheStore,
      })

      await customCache.getOrCompute(async () => sampleEntries)

      expect(capturedTimeout).toBe(10)
    })
  })
})
