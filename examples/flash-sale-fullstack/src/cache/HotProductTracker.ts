/**
 * 熱度追蹤系統
 *
 * 使用 Redis Sorted Set 追蹤商品熱度
 * - 實時更新訪問計數
 * - 支援按時間窗口的熱度衰減
 * - 提供 Top N 商品查詢
 */

export interface HeatMetrics {
  productId: string
  score: number
  lastUpdated: number
  viewCount: number
}

export class HotProductTracker {
  private readonly redisClient: any
  private readonly heatKeyPrefix = 'heat:'
  private readonly windowSeconds = 3600 // 1 小時時間窗口

  constructor(redisClient: any) {
    this.redisClient = redisClient
  }

  /**
   * 記錄商品訪問
   */
  async recordView(productId: string): Promise<number> {
    const key = `${this.heatKeyPrefix}product`
    const timestamp = Date.now() / 1000

    // 使用 ZADD 添加到 Sorted Set，score 為時間戳
    const existingScore = await this.redisClient.zscore(key, productId)
    const newScore = timestamp + (this.extractCount(existingScore) + 1) / 1000

    await this.redisClient.zadd(key, newScore, productId)
    await this.redisClient.expire(key, this.windowSeconds * 2)

    return newScore
  }

  /**
   * 取得商品熱度
   */
  async getHeat(productId: string): Promise<number> {
    const key = `${this.heatKeyPrefix}product`
    const score = await this.redisClient.zscore(key, productId)
    return score ? this.extractCount(score) : 0
  }

  /**
   * 取得前 N 熱銷商品
   */
  async getTopProducts(limit = 100): Promise<HeatMetrics[]> {
    const key = `${this.heatKeyPrefix}product`
    const items = await this.redisClient.zrevrange(key, 0, limit - 1, 'WITHSCORES')

    const results: HeatMetrics[] = []
    for (let i = 0; i < items.length; i += 2) {
      const productId = items[i]
      const score = parseFloat(items[i + 1])

      results.push({
        productId,
        score,
        lastUpdated: Math.floor(score),
        viewCount: this.extractCount(score),
      })
    }

    return results
  }

  /**
   * 檢查商品是否達到預熱閾值
   */
  async shouldWarmup(productId: string, threshold = 100): Promise<boolean> {
    const heat = await this.getHeat(productId)
    return heat > threshold
  }

  /**
   * 重置特定商品的熱度
   */
  async resetHeat(productId: string): Promise<void> {
    const key = `${this.heatKeyPrefix}product`
    await this.redisClient.zrem(key, productId)
  }

  /**
   * 清理過期的熱度數據
   */
  async cleanup(): Promise<number> {
    const key = `${this.heatKeyPrefix}product`
    const now = Date.now() / 1000

    const removed = await this.redisClient.zremrangebyscore(
      key,
      '-inf',
      now - this.windowSeconds * 2
    )

    return removed
  }

  /**
   * 取得熱度統計信息
   */
  async getStats(): Promise<{
    totalProducts: number
    topProduct: HeatMetrics | null
    avgHeat: number
  }> {
    const key = `${this.heatKeyPrefix}product`

    const count = await this.redisClient.zcard(key)
    const topProducts = await this.getTopProducts(1)
    const topProduct = topProducts.length > 0 ? topProducts[0] : null

    let totalHeat = 0
    if (count > 0) {
      const allProducts = await this.redisClient.zrange(key, 0, -1, 'WITHSCORES')
      for (let i = 1; i < allProducts.length; i += 2) {
        totalHeat += this.extractCount(parseFloat(allProducts[i]))
      }
    }

    return {
      totalProducts: count,
      topProduct,
      avgHeat: count > 0 ? totalHeat / count : 0,
    }
  }

  private extractCount(score: number): number {
    if (!score) return 0
    return Math.floor((score % 1) * 1000)
  }
}
