/**
 * Redis Cache Service
 *
 * 基於真實 Redis 的快取服務實現
 * 用於生產環境的高性能快取層
 */

import type { CacheService } from '@gravito/core'
import type { RedisClientContract } from '@gravito/plasma'

/**
 * RedisCacheService
 *
 * 實現 CacheService 接口，連接到真實 Redis 服務器
 */
export class RedisCacheService implements CacheService {
  private readonly keyPrefix: string

  constructor(
    private redis: RedisClientContract,
    prefix = 'flash-sale:'
  ) {
    this.keyPrefix = prefix
  }

  /**
   * 生成快取鍵
   */
  private makeKey(key: string): string {
    return `${this.keyPrefix}${key}`
  }

  /**
   * 從快取獲取值
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const fullKey = this.makeKey(key)
      const value = await this.redis.get(fullKey)

      if (!value) {
        return null
      }

      // 嘗試解析 JSON
      try {
        return JSON.parse(value) as T
      } catch {
        // 如果不是 JSON，直接返回字符串
        return value as unknown as T
      }
    } catch (error) {
      console.error(`[RedisCacheService] 獲取快取失敗: ${key}`, error)
      return null
    }
  }

  /**
   * 設置快取值
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const fullKey = this.makeKey(key)
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)

      if (ttl) {
        // 使用 EX（秒）設置 TTL
        await this.redis.set(fullKey, serialized, { ex: ttl })
      } else {
        // 沒有 TTL，永久存儲
        await this.redis.set(fullKey, serialized)
      }
    } catch (error) {
      console.error(`[RedisCacheService] 設置快取失敗: ${key}`, error)
      throw error
    }
  }

  /**
   * 刪除快取
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.makeKey(key)
      await this.redis.del(fullKey)
    } catch (error) {
      console.error(`[RedisCacheService] 刪除快取失敗: ${key}`, error)
      throw error
    }
  }

  /**
   * 清除所有快取
   */
  async clear(): Promise<void> {
    try {
      // 使用 SCAN 來迭代和刪除所有匹配前綴的鍵
      const pattern = `${this.keyPrefix}*`
      const keys: string[] = []

      // 使用 SCAN 逐批掃描鍵
      let cursor = '0'
      do {
        const result = await this.redis.scan(cursor, { match: pattern, count: 100 })
        cursor = result.cursor
        keys.push(...result.keys)
      } while (cursor !== '0')

      // 批量刪除
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error('[RedisCacheService] 清除快取失敗', error)
      throw error
    }
  }

  /**
   * Remember 模式：如果快取存在則返回，否則執行回調並快取結果
   */
  async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    try {
      // 嘗試從快取獲取
      const cached = await this.get<T>(key)
      if (cached !== null) {
        return cached
      }

      // 快取未命中，執行回調
      const result = await callback()

      // 保存到快取
      await this.set(key, result, ttl)

      return result
    } catch (error) {
      console.error(`[RedisCacheService] Remember 操作失敗: ${key}`, error)
      throw error
    }
  }

  /**
   * 檢查快取鍵是否存在
   */
  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.makeKey(key)
      const exists = await this.redis.exists(fullKey)
      return exists > 0
    } catch (error) {
      console.error(`[RedisCacheService] 檢查快取失敗: ${key}`, error)
      return false
    }
  }

  /**
   * 遞增計數器
   */
  async increment(key: string, value = 1): Promise<number> {
    try {
      const fullKey = this.makeKey(key)
      const result = await this.redis.incrby(fullKey, value)
      return result
    } catch (error) {
      console.error(`[RedisCacheService] 遞增失敗: ${key}`, error)
      throw error
    }
  }

  /**
   * 遞減計數器
   */
  async decrement(key: string, value = 1): Promise<number> {
    try {
      const fullKey = this.makeKey(key)
      const result = await this.redis.decrby(fullKey, value)
      return result
    } catch (error) {
      console.error(`[RedisCacheService] 遞減失敗: ${key}`, error)
      throw error
    }
  }

  /**
   * 根據模式刪除快取（簡易實現）
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const fullPattern = `${this.keyPrefix}${pattern}`
      const keys: string[] = []

      // 使用 SCAN 掃描匹配的鍵
      let cursor = '0'
      do {
        const result = await this.redis.scan(cursor, { match: fullPattern, count: 100 })
        cursor = result.cursor
        keys.push(...result.keys)
      } while (cursor !== '0')

      // 批量刪除
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }

      return keys.length
    } catch (error) {
      console.error(`[RedisCacheService] 模式刪除失敗: ${pattern}`, error)
      throw error
    }
  }

  /**
   * 取得快取統計信息
   */
  async getStats(): Promise<{
    keysCount: number
    memoryUsage: string
  }> {
    try {
      const pattern = `${this.keyPrefix}*`
      let count = 0

      // 計算快取鍵數量
      let cursor = '0'
      do {
        const result = await this.redis.scan(cursor, { match: pattern, count: 100 })
        cursor = result.cursor
        count += result.keys.length
      } while (cursor !== '0')

      // 取得 Redis 記憶體使用情況
      const info = await this.redis.info('memory')
      const lines = (info || '').split('\r\n')
      let memoryUsage = 'unknown'

      for (const line of lines) {
        if (line.startsWith('used_memory_human:')) {
          memoryUsage = line.split(':')[1] || 'unknown'
          break
        }
      }

      return {
        keysCount: count,
        memoryUsage,
      }
    } catch (error) {
      console.error('[RedisCacheService] 取得統計失敗', error)
      return {
        keysCount: 0,
        memoryUsage: 'error',
      }
    }
  }
}
