/**
 * HotnessTracker - 商品熱度追蹤器
 *
 * 使用 Redis Sorted Set 存儲商品訪問熱度
 * 支持時間衰減機制避免過時數據累積
 */

import type { RedisClientContract } from '@gravito/plasma'

interface Logger {
  debug(message: string): void
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

/**
 * HotnessTracker 類
 *
 * 追蹤商品訪問頻率，用於智能快取預熱
 */
export class HotnessTracker {
  private readonly keyPrefix = 'hotness:'
  private readonly decayInterval = 3600 // 1 小時
  private readonly decayFactor = 0.9 // 每小時衰減 10%
  private lastDecay = Date.now()

  constructor(
    private redis: RedisClientContract,
    private logger: Logger
  ) {}

  /**
   * 記錄單個商品訪問
   */
  async recordAccess(productId: string): Promise<void> {
    try {
      const key = `${this.keyPrefix}scores`

      // 使用 ZADD 將分數增加 1（或初始化為 1）
      await this.redis.zadd(key, { member: productId, score: 1 })

      // 應用衰減（如果足夠時間已過）
      await this.applyDecay()
    } catch (error) {
      this.logger.error(`[Hotness] 記錄訪問失敗: ${String(error)}`)
    }
  }

  /**
   * 批量記錄訪問（性能優化）
   */
  async recordBatchAccess(productIds: string[]): Promise<void> {
    if (!productIds || productIds.length === 0) {
      return
    }

    try {
      const key = `${this.keyPrefix}scores`

      // 批量增加分數
      for (const id of productIds) {
        await this.redis.zadd(key, { member: id, score: 1 })
      }

      await this.applyDecay()
    } catch (error) {
      this.logger.error(`[Hotness] 批量記錄訪問失敗: ${String(error)}`)
    }
  }

  /**
   * 獲取 Top N 熱點商品
   */
  async getTopHot(limit: number): Promise<string[]> {
    try {
      const key = `${this.keyPrefix}scores`

      // 使用 ZREVRANGE 獲取分數最高的 N 個商品
      const results = await this.redis.zrevrange(key, 0, limit - 1)

      return (results as string[]) || []
    } catch (error) {
      this.logger.error(`[Hotness] 獲取熱點商品失敗: ${String(error)}`)
      return []
    }
  }

  /**
   * 獲取商品的當前熱度分數
   */
  async getHotness(productId: string): Promise<number> {
    try {
      const key = `${this.keyPrefix}scores`
      const score = await this.redis.zscore(key, productId)
      return typeof score === 'number' ? score : 0
    } catch (error) {
      this.logger.error(`[Hotness] 獲取熱度分數失敗: ${String(error)}`)
      return 0
    }
  }

  /**
   * 應用時間衰減（每小時 10%）
   * 防止過時數據的分數過高
   */
  private async applyDecay(): Promise<void> {
    const now = Date.now()

    // 檢查是否需要應用衰減
    if (now - this.lastDecay < this.decayInterval * 1000) {
      return
    }

    try {
      const key = `${this.keyPrefix}scores`

      // 使用 Lua 腳本保證原子性
      // 將所有成員的分數乘以衰減因子
      const luaScript = `
        local key = KEYS[1]
        local factor = tonumber(ARGV[1])
        local members = redis.call('zrange', key, 0, -1)
        for i, member in ipairs(members) do
          local score = tonumber(redis.call('zscore', key, member))
          redis.call('zadd', key, score * factor, member)
        end
        return #members
      `

      const result = await this.redis.eval(luaScript, 1, key, String(this.decayFactor))

      this.lastDecay = now
      this.logger.debug(`[Hotness] 應用衰減完成，影響 ${String(result)} 個商品`)
    } catch (error) {
      this.logger.error(`[Hotness] 應用衰減失敗: ${String(error)}`)
    }
  }

  /**
   * 重置所有熱度數據（用於測試和管理）
   */
  async reset(): Promise<void> {
    try {
      const key = `${this.keyPrefix}scores`
      await this.redis.del(key)
      this.lastDecay = Date.now()
      this.logger.info('[Hotness] 熱度數據已重置')
    } catch (error) {
      this.logger.error(`[Hotness] 重置失敗: ${String(error)}`)
    }
  }

  /**
   * 獲取統計信息
   */
  async getStats(): Promise<{
    totalProducts: number
    topProduct: string | null
    topScore: number
  }> {
    try {
      const key = `${this.keyPrefix}scores`
      const totalProducts = await this.redis.zcard(key)
      const topResult = await this.redis.zrevrange(key, 0, 0)

      if (!topResult || topResult.length === 0) {
        return {
          totalProducts: totalProducts ?? 0,
          topProduct: null,
          topScore: 0,
        }
      }

      // 獲取頂部商品的分數
      const topProduct = topResult[0]
      const topScore = await this.getHotness(String(topProduct))

      return {
        totalProducts: totalProducts ?? 0,
        topProduct: String(topProduct),
        topScore,
      }
    } catch (error) {
      this.logger.error(`[Hotness] 獲取統計失敗: ${String(error)}`)
      return {
        totalProducts: 0,
        topProduct: null,
        topScore: 0,
      }
    }
  }
}
