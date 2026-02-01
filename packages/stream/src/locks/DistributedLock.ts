import type { GroupRedisClient } from '../drivers/RedisDriver'

/**
 * 分散式鎖的配置選項。
 *
 * 定義鎖的生存時間、重試策略和自動續約行為。
 *
 * @public
 * @since 3.1.0
 * @example
 * ```typescript
 * const options: LockOptions = {
 *   ttl: 60000,           // 鎖持有 60 秒
 *   retryCount: 3,        // 嘗試獲取 3 次
 *   retryDelay: 100,      // 每次間隔 100ms
 *   refreshInterval: 20000 // 每 20 秒自動續約
 * };
 * ```
 */
export interface LockOptions {
  /**
   * 鎖的生存時間（毫秒）。
   *
   * 如果鎖持有者在 TTL 過期前未釋放或續約，鎖將自動失效。
   */
  ttl: number

  /**
   * 獲取鎖失敗時的重試次數。
   *
   * 設為 0 表示不重試，失敗即返回 false。
   */
  retryCount: number

  /**
   * 每次重試之間的延遲時間（毫秒）。
   */
  retryDelay: number

  /**
   * 自動續約的間隔時間（毫秒）。
   *
   * 如果設定此值，鎖將每隔 refreshInterval 自動延長 TTL，
   * 避免長時間任務執行期間鎖過期。建議設為 TTL 的 1/3。
   *
   * @optional
   */
  refreshInterval?: number
}

/**
 * 分散式鎖實作，基於 Redis 實現 Redlock 風格的鎖機制。
 *
 * 此類別提供分散式環境下的互斥鎖，確保同一時間只有一個節點能持有特定鎖。
 * 支援自動續約、重試機制和安全的鎖釋放（僅釋放自己持有的鎖）。
 *
 * @public
 * @since 3.1.0
 * @example
 * ```typescript
 * const lock = new DistributedLock(redisClient);
 *
 * const acquired = await lock.acquire('my-resource', {
 *   ttl: 60000,
 *   retryCount: 3,
 *   retryDelay: 100,
 *   refreshInterval: 20000
 * });
 *
 * if (acquired) {
 *   try {
 *     // 執行需要互斥的操作
 *   } finally {
 *     await lock.release('my-resource');
 *   }
 * }
 * ```
 */
export class DistributedLock {
  /**
   * 此鎖實例的唯一識別碼，用於確保只釋放自己持有的鎖。
   */
  private lockId = crypto.randomUUID()

  /**
   * 自動續約的定時器。
   */
  private refreshTimer: NodeJS.Timeout | null = null

  /**
   * 當前持有的鎖的鍵名，用於追蹤狀態。
   */
  private currentLockKey: string | null = null

  /**
   * 創建分散式鎖實例。
   *
   * @param client - Redis 客戶端實例，必須支援 SET、DEL、EVAL 命令。
   */
  constructor(private client: GroupRedisClient) {}

  /**
   * 嘗試獲取指定鍵的分散式鎖。
   *
   * 使用 Redis SET NX（Not eXists）命令實現原子性鎖獲取。
   * 如果鎖已被其他節點持有，可根據 retryCount 選項進行重試。
   * 獲取成功後，如果設定了 refreshInterval，將啟動自動續約機制。
   *
   * @param key - 鎖的鍵名，建議使用有意義的資源標識符。
   * @param options - 鎖的配置選項。
   * @returns 成功獲取鎖時返回 true，否則返回 false。
   *
   * @throws {Error} 當 Redis 客戶端不支援必要的命令時拋出錯誤。
   *
   * @example
   * ```typescript
   * const acquired = await lock.acquire('schedule:job-123', {
   *   ttl: 30000,
   *   retryCount: 5,
   *   retryDelay: 200
   * });
   *
   * if (!acquired) {
   *   console.log('無法獲取鎖，資源可能正被其他節點使用');
   * }
   * ```
   */
  async acquire(key: string, options: LockOptions): Promise<boolean> {
    if (typeof this.client.set !== 'function') {
      throw new Error('[DistributedLock] Redis client does not support SET command')
    }

    const ttlSeconds = Math.ceil(options.ttl / 1000)
    let attempts = 0

    while (attempts <= options.retryCount) {
      try {
        // 使用 SET key value EX ttl NX 實現原子性鎖獲取
        // NX: 只在鍵不存在時設值
        // EX: 設定過期時間（秒）
        const result = await this.client.set(key, this.lockId, 'EX', ttlSeconds, 'NX')

        if (result === 'OK') {
          this.currentLockKey = key

          // 啟動自動續約機制
          if (options.refreshInterval) {
            this.startRefresh(key, options)
          }

          return true
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        console.error(`[DistributedLock] Failed to acquire lock for ${key}:`, err.message)
      }

      attempts++
      if (attempts <= options.retryCount) {
        // 等待後重試
        await this.sleep(options.retryDelay)
      }
    }

    return false
  }

  /**
   * 釋放指定鍵的鎖。
   *
   * 使用 Lua script 確保只有鎖的持有者才能釋放鎖，避免誤刪其他節點的鎖。
   * 釋放成功後會自動停止續約定時器。
   *
   * @param key - 要釋放的鎖鍵名。
   *
   * @throws {Error} 當 Redis 客戶端不支援 EVAL 命令時拋出錯誤。
   *
   * @example
   * ```typescript
   * await lock.release('schedule:job-123');
   * ```
   */
  async release(key: string): Promise<void> {
    // 停止自動續約
    this.stopRefresh()

    if (typeof this.client.eval !== 'function') {
      throw new Error('[DistributedLock] Redis client does not support EVAL command')
    }

    try {
      // 使用 Lua script 確保原子性：只有當鎖的值等於 lockId 時才刪除
      // 這避免了刪除其他節點獲取的鎖
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `

      await this.client.eval(script, 1, key, this.lockId)
      this.currentLockKey = null
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error(`[DistributedLock] Failed to release lock for ${key}:`, err.message)
    }
  }

  /**
   * 啟動自動續約機制。
   *
   * 在後台定期延長鎖的 TTL，確保長時間運行的任務不會因鎖過期而被中斷。
   * 續約過程同樣使用 Lua script 確保只續約自己持有的鎖。
   *
   * @param key - 鎖的鍵名。
   * @param options - 鎖的配置選項。
   * @private
   */
  private startRefresh(key: string, options: LockOptions): void {
    if (!options.refreshInterval) {
      return
    }

    // 確保先停止舊的定時器
    this.stopRefresh()

    const ttlSeconds = Math.ceil(options.ttl / 1000)

    this.refreshTimer = setInterval(async () => {
      try {
        if (typeof this.client.eval !== 'function') {
          console.error('[DistributedLock] Redis client does not support EVAL command for refresh')
          return
        }

        // 使用 Lua script 確保只續約自己持有的鎖
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("expire", KEYS[1], ARGV[2])
          else
            return 0
          end
        `

        const result = await this.client.eval(script, 1, key, this.lockId, ttlSeconds)

        if (result === 0) {
          console.warn(
            `[DistributedLock] Lock ${key} no longer held by this instance, stopping refresh`
          )
          this.stopRefresh()
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        console.error(`[DistributedLock] Failed to refresh lock ${key}:`, err.message)
      }
    }, options.refreshInterval)
  }

  /**
   * 停止自動續約定時器。
   *
   * @private
   */
  private stopRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * 延遲執行的輔助函數。
   *
   * @param ms - 延遲的毫秒數。
   * @returns Promise，在指定時間後 resolve。
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 檢查是否當前持有指定的鎖。
   *
   * @param key - 鎖的鍵名。
   * @returns 如果當前持有該鎖返回 true，否則返回 false。
   *
   * @example
   * ```typescript
   * if (lock.isHeld('schedule:job-123')) {
   *   console.log('當前持有鎖');
   * }
   * ```
   */
  isHeld(key: string): boolean {
    return this.currentLockKey === key
  }
}
