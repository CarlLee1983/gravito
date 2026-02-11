/**
 * 測試 Redis 連接
 * 用於集成測試，使用獨立的命名空間避免污染生產數據
 */

const TEST_PREFIX = 'test:'

export class TestRedis {
  private client: any
  private prefix: string

  constructor(redisClient: any, prefix: string = TEST_PREFIX) {
    this.client = redisClient
    this.prefix = prefix
  }

  /**
   * 獲取帶前綴的鍵
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  /**
   * 設置值
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const fullKey = this.getKey(key)
    if (ttlSeconds) {
      await this.client.setex(fullKey, ttlSeconds, value)
    } else {
      await this.client.set(fullKey, value)
    }
  }

  /**
   * 獲取值
   */
  async get(key: string): Promise<string | null> {
    const fullKey = this.getKey(key)
    return await this.client.get(fullKey)
  }

  /**
   * 刪除鍵
   */
  async del(key: string): Promise<void> {
    const fullKey = this.getKey(key)
    await this.client.del(fullKey)
  }

  /**
   * 設置有序集合
   */
  async zadd(key: string, score: number, member: string): Promise<void> {
    const fullKey = this.getKey(key)
    await this.client.zadd(fullKey, score, member)
  }

  /**
   * 獲取有序集合成員
   */
  async zscore(key: string, member: string): Promise<number | null> {
    const fullKey = this.getKey(key)
    return await this.client.zscore(fullKey, member)
  }

  /**
   * 獲取有序集合的範圍（按反序）
   */
  async zrevrange(
    key: string,
    start: number,
    stop: number,
    withScores = false
  ): Promise<string[] | number[]> {
    const fullKey = this.getKey(key)
    if (withScores) {
      return await this.client.zrevrange(fullKey, start, stop, 'WITHSCORES')
    }
    return await this.client.zrevrange(fullKey, start, stop)
  }

  /**
   * 獲取有序集合的範圍（按序）
   */
  async zrange(
    key: string,
    start: number,
    stop: number,
    withScores = false
  ): Promise<string[] | number[]> {
    const fullKey = this.getKey(key)
    if (withScores) {
      return await this.client.zrange(fullKey, start, stop, 'WITHSCORES')
    }
    return await this.client.zrange(fullKey, start, stop)
  }

  /**
   * 獲取有序集合大小
   */
  async zcard(key: string): Promise<number> {
    const fullKey = this.getKey(key)
    return await this.client.zcard(fullKey)
  }

  /**
   * 移除有序集合成員
   */
  async zrem(key: string, member: string): Promise<number> {
    const fullKey = this.getKey(key)
    return await this.client.zrem(fullKey, member)
  }

  /**
   * 設置過期時間
   */
  async expire(key: string, seconds: number): Promise<number> {
    const fullKey = this.getKey(key)
    return await this.client.expire(fullKey, seconds)
  }

  /**
   * 清空所有測試數據
   */
  async cleanup(): Promise<void> {
    // 獲取所有帶前綴的鍵
    const keys = await this.client.keys(`${this.prefix}*`)
    if (keys.length > 0) {
      await this.client.del(...keys)
    }
  }

  /**
   * 獲取統計信息
   */
  async getStats(): Promise<{
    keyCount: number
    memoryUsed: number
  }> {
    const keys = await this.client.keys(`${this.prefix}*`)
    // 估算記憶體使用（簡化版本）
    let memoryUsed = 0
    for (const key of keys) {
      const size = await this.client.memory('USAGE', key)
      if (typeof size === 'number') {
        memoryUsed += size
      }
    }
    return {
      keyCount: keys.length,
      memoryUsed,
    }
  }
}

/**
 * 建立測試 Redis 連接
 */
export async function setupTestRedis(redisClient: any): Promise<TestRedis> {
  const testRedis = new TestRedis(redisClient)
  // 清空舊的測試數據
  await testRedis.cleanup()
  return testRedis
}

/**
 * 清理測試 Redis
 */
export async function cleanupTestRedis(testRedis: TestRedis): Promise<void> {
  await testRedis.cleanup()
}
