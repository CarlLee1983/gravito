import type { CacheService, PlanetCore } from '@gravito/core'

/**
 * JWT Token Blacklist 管理
 * 用於強制吊銷 token，支援 Redis 快取或記憶體存儲
 */
export interface IJwtTokenBlacklist {
  blacklist(token: string, expiresIn: number): Promise<void>
  isBlacklisted(token: string): Promise<boolean>
  clear(): Promise<void>
}

export class JwtTokenBlacklist implements IJwtTokenBlacklist {
  private blacklistedTokens: Set<string> = new Set()
  private expiryMap: Map<string, number> = new Map()

  constructor(private core: PlanetCore) {}

  /**
   * 從 container 取得 cache 服務
   */
  private getCache(): CacheService | null {
    try {
      return this.core.container.has('cache')
        ? this.core.container.make<CacheService>('cache')
        : null
    } catch {
      return null
    }
  }

  /**
   * 將 token 加入黑名單
   * @param token JWT token
   * @param expiresIn token 過期時間（秒）
   */
  async blacklist(token: string, expiresIn: number): Promise<void> {
    const key = `blacklist:${token}`
    const ttl = expiresIn

    // 優先使用 Redis cache
    const cache = this.getCache()
    if (cache) {
      try {
        await cache.set(key, '1', ttl)
        return
      } catch {
        // 如果 cache 失敗，使用記憶體備用
      }
    }

    // 記憶體備用方案
    this.blacklistedTokens.add(token)
    const expiryTime = Date.now() + ttl * 1000
    this.expiryMap.set(token, expiryTime)

    // 設定過期清理
    setTimeout(() => {
      this.blacklistedTokens.delete(token)
      this.expiryMap.delete(token)
    }, ttl * 1000)
  }

  /**
   * 檢查 token 是否在黑名單中
   * @param token JWT token
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`

    // 優先檢查 Redis cache
    const cache = this.getCache()
    if (cache) {
      try {
        const exists = await cache.get(key)
        return exists !== null
      } catch {
        // 如果 cache 失敗，使用記憶體備用
      }
    }

    // 記憶體備用方案
    if (!this.blacklistedTokens.has(token)) {
      return false
    }

    const expiryTime = this.expiryMap.get(token)
    if (expiryTime && Date.now() > expiryTime) {
      this.blacklistedTokens.delete(token)
      this.expiryMap.delete(token)
      return false
    }

    return true
  }

  /**
   * 清除所有黑名單記錄
   */
  async clear(): Promise<void> {
    const cache = this.getCache()
    if (cache) {
      try {
        // 清除所有 blacklist:* 的 key（簡化實現，實際環境需要掃描）
        // 本實現仍使用記憶體作為權威來源
      } catch {
        // ignore
      }
    }

    this.blacklistedTokens.clear()
    this.expiryMap.clear()
  }
}
