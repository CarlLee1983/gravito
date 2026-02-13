/**
 * Token Blacklist Service
 *
 * 管理失效的 JWT Token（用於 logout、token revocation 等）
 */

export interface TokenBlacklistService {
  /**
   * 將 Token 添加到黑名單
   */
  add(token: string, expiryTime: number): Promise<void>

  /**
   * 檢查 Token 是否在黑名單中
   */
  has(token: string): Promise<boolean>

  /**
   * 從黑名單中移除 Token
   */
  remove(token: string): Promise<void>

  /**
   * 清空黑名單
   */
  clear(): Promise<void>
}

/**
 * 內存實現（開發和測試用）
 */
export class InMemoryTokenBlacklist implements TokenBlacklistService {
  private blacklist: Map<string, number> = new Map()
  private cleanupInterval: NodeJS.Timer | null = null

  constructor() {
    // 定期清理過期的 token（每分鐘檢查一次）
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  async add(token: string, expiryTime: number): Promise<void> {
    this.blacklist.set(token, expiryTime)
  }

  async has(token: string): Promise<boolean> {
    const expiryTime = this.blacklist.get(token)

    if (!expiryTime) {
      return false
    }

    // 如果已過期，從黑名單中移除
    if (Date.now() > expiryTime) {
      this.blacklist.delete(token)
      return false
    }

    return true
  }

  async remove(token: string): Promise<void> {
    this.blacklist.delete(token)
  }

  async clear(): Promise<void> {
    this.blacklist.clear()
  }

  /**
   * 清理過期的 token
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [token, expiryTime] of this.blacklist.entries()) {
      if (now > expiryTime) {
        this.blacklist.delete(token)
      }
    }
  }

  /**
   * 關閉清理定時器
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

/**
 * Redis 實現（生產環境推薦）
 */
export class RedisTokenBlacklist implements TokenBlacklistService {
  private redisKey = 'token_blacklist'

  constructor(
    private redisClient?: any // Redis 客戶端實例
  ) {}

  async add(token: string, expiryTime: number): Promise<void> {
    if (!this.redisClient) {
      return
    }

    // 計算 TTL（秒）
    const ttl = Math.ceil((expiryTime - Date.now()) / 1000)
    if (ttl > 0) {
      await this.redisClient.setex(`${this.redisKey}:${token}`, ttl, '1')
    }
  }

  async has(token: string): Promise<boolean> {
    if (!this.redisClient) {
      return false
    }

    const exists = await this.redisClient.exists(`${this.redisKey}:${token}`)
    return exists === 1
  }

  async remove(token: string): Promise<void> {
    if (!this.redisClient) {
      return
    }

    await this.redisClient.del(`${this.redisKey}:${token}`)
  }

  async clear(): Promise<void> {
    if (!this.redisClient) {
      return
    }

    // 刪除所有黑名單 key
    const keys = await this.redisClient.keys(`${this.redisKey}:*`)
    if (keys.length > 0) {
      await this.redisClient.del(...keys)
    }
  }
}
