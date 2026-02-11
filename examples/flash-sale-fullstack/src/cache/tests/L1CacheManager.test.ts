/**
 * L1CacheManager 單元測試
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { L1CacheManager } from '../L1CacheManager'

describe('L1CacheManager', () => {
  let cache: L1CacheManager<any>

  beforeEach(() => {
    cache = new L1CacheManager(10 * 1024 * 1024, 1000)
  })

  describe('set and get', () => {
    it('應該能夠設置和獲取值', async () => {
      cache.set('key1', { id: 1, name: 'test' }, 300)
      const value = await cache.get('key1')
      expect(value).toEqual({ id: 1, name: 'test' })
    })

    it('不存在的鍵應該返回 null', async () => {
      const value = await cache.get('non-existent')
      expect(value).toBeNull()
    })

    it('應該覆蓋舊值', async () => {
      cache.set('key1', { value: 1 }, 300)
      cache.set('key1', { value: 2 }, 300)
      const value = await cache.get('key1')
      expect(value?.value).toBe(2)
    })
  })

  describe('分層快取', () => {
    it('應該支持 L1-only 讀取', async () => {
      cache.set('product-1', { id: 1, name: 'Product 1' }, 300)
      const value = await cache.get('product-1')
      expect(value?.id).toBe(1)
    })

    it('應該支持帶 L2 和 L3 的分層讀取', async () => {
      const mockL2Cache = {
        get: async () => ({ id: 2, name: 'Product 2' }),
        set: async () => true,
      }

      const l3Loader = async () => ({ id: 3, name: 'Product 3' })

      const value = await cache.get('product-1', mockL2Cache, l3Loader)
      expect(value?.id).toBe(2)
    })

    it('L2 未命中時應該回源到 L3', async () => {
      const mockL2Cache = {
        get: async () => null,
        set: async () => true,
      }

      let l3Called = false
      const l3Loader = async () => {
        l3Called = true
        return { id: 3, name: 'Product 3' }
      }

      const value = await cache.get('product-1', mockL2Cache, l3Loader)
      expect(l3Called).toBe(true)
      expect(value?.id).toBe(3)
    })
  })

  describe('delete', () => {
    it('應該能夠刪除值', async () => {
      cache.set('key1', { id: 1 }, 300)
      const deleted = cache.delete('key1')
      expect(deleted).toBe(true)
      expect(await cache.get('key1')).toBeNull()
    })

    it('刪除不存在的鍵應該返回 false', () => {
      const deleted = cache.delete('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('deletePattern', () => {
    it('應該按模式刪除多個值', async () => {
      cache.set('product:1', { id: 1 }, 300)
      cache.set('product:2', { id: 2 }, 300)
      cache.set('user:1', { id: 1 }, 300)

      const deleted = cache.deletePattern('product:.*')
      expect(deleted).toBe(2)
      expect(await cache.get('product:1')).toBeNull()
      expect(await cache.get('user:1')).toBeDefined()
    })
  })

  describe('clear', () => {
    it('應該清空所有快取', async () => {
      cache.set('key1', { id: 1 }, 300)
      cache.set('key2', { id: 2 }, 300)

      cache.clear()
      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBeNull()
    })
  })

  describe('invalidateWithL2', () => {
    it('應該同時刪除 L1 和 L2', async () => {
      cache.set('key1', { id: 1 }, 300)

      const mockL2Cache = {
        delete: async () => true,
      }

      await cache.invalidateWithL2('key1', mockL2Cache)
      expect(await cache.get('key1')).toBeNull()
    })

    it('L2 錯誤時應該繼續', async () => {
      cache.set('key1', { id: 1 }, 300)

      const mockL2Cache = {
        delete: async () => {
          throw new Error('L2 error')
        },
      }

      await cache.invalidateWithL2('key1', mockL2Cache)
      expect(await cache.get('key1')).toBeNull()
    })
  })

  describe('stats', () => {
    it('應該追蹤命中率', async () => {
      cache.set('key1', { id: 1 }, 300)

      // L1 命中
      await cache.get('key1')
      await cache.get('key1')

      // L1 未命中
      await cache.get('key2')

      const stats = cache.getStats()
      expect(stats.l1Hits).toBe(2)
      expect(stats.totalHits).toBeGreaterThan(0)
      expect(stats.l1HitRate).toBeGreaterThan(0)
    })

    it('應該追蹤記憶體使用', () => {
      cache.set('key1', { id: 1, data: 'test' }, 300)
      const stats = cache.getStats()
      expect(stats.currentSize).toBeGreaterThan(0)
      expect(stats.currentSize).toBeLessThanOrEqual(stats.maxSize)
    })

    it('應該能夠重置統計', () => {
      cache.set('key1', { id: 1 }, 300)
      cache.get('key1')

      cache.resetStats()
      const stats = cache.getStats()
      expect(stats.l1Hits).toBe(0)
      expect(stats.totalHits).toBe(0)
    })
  })

  describe('LRU 驅逐', () => {
    it('達到最大條目數時應該驅逐', async () => {
      const smallCache = new L1CacheManager(10 * 1024 * 1024, 3)

      smallCache.set('key1', { id: 1 }, 300)
      smallCache.set('key2', { id: 2 }, 300)
      smallCache.set('key3', { id: 3 }, 300)

      // 訪問 key1 和 key2 增加它們的命中數
      await smallCache.get('key1')
      await smallCache.get('key2')

      // 添加新鍵應該驅逐 key3（最少使用）
      smallCache.set('key4', { id: 4 }, 300)

      expect(await smallCache.get('key3')).toBeNull()
      expect(await smallCache.get('key1')).toBeDefined()
    })
  })

  describe('TTL 過期', () => {
    it('TTL 過期的值應該被視為不存在', async () => {
      cache.set('key1', { id: 1 }, -1) // TTL = -1（已過期）
      // 應該返回 null，因為條目已過期
      expect(await cache.get('key1')).toBeNull()
    })
  })
})
