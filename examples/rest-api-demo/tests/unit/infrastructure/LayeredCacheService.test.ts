/**
 * LayeredCacheService 單元測試
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LayeredCacheService } from '../../../src/infrastructure/cache/LayeredCacheService'

describe('LayeredCacheService', () => {
  let cacheService: LayeredCacheService
  let mockL2Service: any

  beforeEach(() => {
    mockL2Service = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      deletePattern: vi.fn().mockResolvedValue(undefined),
      flush: vi.fn().mockResolvedValue(undefined),
    }

    cacheService = new LayeredCacheService(mockL2Service, {
      l1Ttl: 10000,
      l2Ttl: 60000,
      l1MaxSize: 10,
    })
  })

  describe('多層快取命中', () => {
    it('L1 命中應返回快取值', async () => {
      // Arrange
      await cacheService.set('key1', { data: 'value1' })

      // Act
      const result = await cacheService.get('key1')

      // Assert
      expect(result).toEqual({ data: 'value1' })
      expect(mockL2Service.get).not.toHaveBeenCalled() // L1 命中，不應查詢 L2
    })

    it('L1 未命中應查詢 L2', async () => {
      // Arrange
      mockL2Service.get.mockResolvedValue({ data: 'l2-value' })

      // Act
      const result = await cacheService.get('key-not-in-l1')

      // Assert
      expect(result).toEqual({ data: 'l2-value' })
      expect(mockL2Service.get).toHaveBeenCalledWith('key-not-in-l1')
    })

    it('完全未命中應返回 null', async () => {
      // Arrange
      mockL2Service.get.mockResolvedValue(null)

      // Act
      const result = await cacheService.get('nonexistent-key')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('快取統計', () => {
    it('應計算快取命中率', async () => {
      // Arrange
      await cacheService.set('key1', 'value1')

      // Act
      mockL2Service.get.mockResolvedValue(null)
      await cacheService.get('key1') // L1 命中
      await cacheService.get('key2') // 未命中
      await cacheService.get('key3') // 未命中

      const stats = cacheService.getStats()

      // Assert
      expect(stats.totalHitRate).toBe(33.33) // 3 次請求，1 次命中
      expect(stats.l1HitRate).toBe(33.33)
    })
  })

  describe('快取清理', () => {
    it('應刪除指定鍵', async () => {
      // Arrange
      await cacheService.set('key1', 'value1')

      // Act
      await cacheService.delete('key1')
      const result = await cacheService.get('key1')

      // Assert
      expect(result).toBeNull()
      expect(mockL2Service.delete).toHaveBeenCalledWith('key1')
    })

    it('應支持模式刪除', async () => {
      // Arrange
      await cacheService.set('product:1', 'p1')
      await cacheService.set('product:2', 'p2')
      await cacheService.set('user:1', 'u1')

      // Act
      await cacheService.deletePattern('product:*')

      // Assert
      expect(await cacheService.get('product:1')).toBeNull()
      expect(await cacheService.get('product:2')).toBeNull()
      expect(await cacheService.get('user:1')).toEqual('u1')
    })
  })
})
