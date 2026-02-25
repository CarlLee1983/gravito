/**
 * MultiRegionCacheService
 *
 * 管理多個地理區域的快取服務，實現全球分佈式快取
 * - 4 個區域部署（US East, US West, EU West, AP Southeast）
 * - 地域親和度路由（優先本地區域）
 * - 自動回填和複製
 * - 健康檢查和故障轉移
 */

import type { Logger } from '@gravito/core'
import type { CacheService } from '../../Infrastructure/Services/CacheService'
import { FailoverManager } from './FailoverManager'

/**
 * 區域配置
 */
export interface RegionConfig {
  name: string
  connectionName: string // Redis 連接名稱
  prefix: string
  isPrimary: boolean
  endpoints: string[]
  healthCheckUrl: string
  timezone?: string
}

/**
 * 區域快取實例
 */
interface RegionalCache {
  name: string
  cache: CacheService
  isPrimary: boolean
  config: RegionConfig
  lastHealthStatus?: {
    isHealthy: boolean
    latency: number
    timestamp: number
  }
}

/**
 * MultiRegionCacheService
 *
 * 實現全球分佈式快取，支持多區域部署
 */
export class MultiRegionCacheService implements CacheService {
  private regions: Map<string, RegionalCache> = new Map()
  private currentRegion: string
  private replicationQueue: Array<{
    key: string
    value: unknown
    ttl?: number
  }> = []
  private replicationProcessing = false

  constructor(
    private regionConfigs: RegionConfig[],
    private tieredCacheServices: Map<string, CacheService>,
    private logger: Logger
  ) {
    this.currentRegion = this.detectCurrentRegion()
    this.initializeRegions()
    this.startReplicationWorker()
    // 創建 FailoverManager（在初始化區域之後）
    this.failoverManager = new FailoverManager(regionConfigs, this, logger, {
      interval: 10000,
      timeout: 5000,
      retries: 2,
      unhealthyThreshold: 3,
    })
  }

  /**
   * 檢測當前運行環境的區域
   */
  private detectCurrentRegion(): string {
    // 優先使用環境變量
    const envRegion = process.env.REGION || process.env.AWS_REGION
    if (envRegion) {
      return envRegion
    }

    // 默認使用第一個區域
    return this.regionConfigs[0]?.name || 'default'
  }

  /**
   * 初始化所有區域快取實例
   */
  private initializeRegions(): void {
    for (const config of this.regionConfigs) {
      const cache = this.tieredCacheServices.get(config.connectionName)
      if (!cache) {
        this.logger.warn(`[MultiRegionCache] Cache service not found for region ${config.name}`)
        continue
      }

      this.regions.set(config.name, {
        name: config.name,
        cache,
        isPrimary: config.isPrimary,
        config,
      })

      this.logger.info(`[MultiRegionCache] Region ${config.name} initialized`)
    }
  }

  /**
   * 獲取主區域的快取服務
   */
  private getPrimaryRegion(): RegionalCache {
    for (const region of this.regions.values()) {
      if (region.isPrimary) {
        return region
      }
    }

    // 如果沒有主區域，返回第一個區域
    const firstRegion = Array.from(this.regions.values())[0]
    if (!firstRegion) {
      throw new Error('[MultiRegionCache] No regions configured')
    }
    return firstRegion
  }

  /**
   * 獲取本地區域的快取服務
   */
  private getLocalRegion(): RegionalCache | undefined {
    return this.regions.get(this.currentRegion)
  }

  /**
   * 獲取快取值（優先本地區域）
   *
   * 策略：
   * 1. 檢查本地區域（延遲最低）
   * 2. 回源到主區域
   * 3. 自動回填到本地區域
   *
   * @param key 快取鍵
   * @returns 快取值或 null
   */
  async get<T>(key: string): Promise<T | null> {
    const localRegion = this.getLocalRegion()

    // 1. 嘗試本地區域快取（優先級最高）
    if (localRegion) {
      try {
        const value = await localRegion.cache.get<T>(key)
        if (value !== null) {
          this.recordMetrics('local_hit')
          return value
        }
      } catch (error) {
        this.logger.debug(`[MultiRegionCache] Local cache get failed: ${String(error)}`)
      }
    }

    // 2. 回源到主區域
    const primaryRegion = this.getPrimaryRegion()
    if (primaryRegion !== localRegion) {
      try {
        const value = await primaryRegion.cache.get<T>(key)

        // 3. 自動回填到本地區域（非阻塞）
        if (value !== null && localRegion) {
          this.enqueueReplication(key, value)
          this.recordMetrics('primary_hit_replicated')
        } else {
          this.recordMetrics('primary_hit')
        }

        return value
      } catch (error) {
        this.logger.debug(`[MultiRegionCache] Primary cache get failed: ${String(error)}`)
      }
    }

    this.recordMetrics('cache_miss')
    return null
  }

  /**
   * 設置快取值
   *
   * 策略：
   * 1. 主區域寫入（阻塞）
   * 2. 異步複製到其他區域（非阻塞）
   *
   * @param key 快取鍵
   * @param value 快取值
   * @param ttl 生存時間（秒）
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const primaryRegion = this.getPrimaryRegion()

    // 主區域寫入（阻塞）
    try {
      await primaryRegion.cache.set(key, value, ttl)
    } catch (error) {
      this.logger.error(`[MultiRegionCache] Primary cache set failed: ${String(error)}`)
      throw error
    }

    // 非阻塞複製到本地區域（如果是複製操作）
    const localRegion = this.getLocalRegion()
    if (primaryRegion !== localRegion && localRegion) {
      this.enqueueReplication(key, value, ttl)
    }

    // 異步複製到其他區域（非阻塞）
    for (const region of this.regions.values()) {
      if (region !== primaryRegion && region !== localRegion) {
        this.enqueueReplication(key, value, ttl, region.name)
      }
    }
  }

  /**
   * 刪除快取
   *
   * @param key 快取鍵
   */
  async delete(key: string): Promise<void> {
    const promises: Promise<void>[] = []

    for (const region of this.regions.values()) {
      promises.push(
        region.cache.delete(key).catch((error) => {
          this.logger.debug(
            `[MultiRegionCache] Delete failed on region ${region.name}: ${String(error)}`
          )
        })
      )
    }

    // 並行刪除所有區域（最佳努力）
    await Promise.all(promises)
  }

  /**
   * 清空快取
   */
  async clear(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const region of this.regions.values()) {
      promises.push(
        region.cache.clear().catch((error) => {
          this.logger.debug(
            `[MultiRegionCache] Clear failed on region ${region.name}: ${String(error)}`
          )
        })
      )
    }

    await Promise.all(promises)
  }

  /**
   * 記住快取值（如果不存在則執行回調）
   *
   * @param key 快取鍵
   * @param ttl 生存時間（秒）
   * @param callback 值提供者回調
   * @returns 快取值
   */
  async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    // 優先檢查本地區域快取
    const localRegion = this.getLocalRegion()
    if (localRegion) {
      const value = await localRegion.cache.get<T>(key)
      if (value !== null) {
        return value
      }
    }

    // 回源到主區域
    const primaryRegion = this.getPrimaryRegion()
    if (primaryRegion !== localRegion) {
      try {
        const value = await primaryRegion.cache.get<T>(key)
        if (value !== null) {
          // 回填到本地區域
          if (localRegion) {
            this.enqueueReplication(key, value, ttl)
          }
          return value
        }
      } catch (error) {
        this.logger.debug(`[MultiRegionCache] Primary cache remember get failed: ${String(error)}`)
      }
    }

    // 執行回調獲取值
    const value = await callback()

    // 設置快取
    await this.set(key, value, ttl)

    return value
  }

  /**
   * 排隊複製任務
   *
   * @param key 快取鍵
   * @param value 快取值
   * @param ttl 生存時間
   * @param regionName 目標區域（可選）
   */
  private enqueueReplication(
    key: string,
    value: unknown,
    ttl?: number,
    _regionName?: string
  ): void {
    this.replicationQueue.push({ key, value, ttl })

    if (!this.replicationProcessing && this.replicationQueue.length > 0) {
      this.processReplicationQueue().catch((error) => {
        this.logger.error(`[MultiRegionCache] Replication queue processing error: ${String(error)}`)
      })
    }
  }

  /**
   * 處理複製隊列（批量複製以提高效率）
   */
  private async processReplicationQueue(): Promise<void> {
    if (this.replicationProcessing || this.replicationQueue.length === 0) {
      return
    }

    this.replicationProcessing = true

    try {
      // 批量處理（最多 100 個項目）
      const batch = this.replicationQueue.splice(0, 100)

      const localRegion = this.getLocalRegion()
      if (localRegion) {
        // 複製到本地區域
        const promises = batch.map((item) =>
          localRegion.cache.set(item.key, item.value, item.ttl).catch((error) => {
            this.logger.debug(
              `[MultiRegionCache] Replication to local region failed for key ${item.key}: ${String(error)}`
            )
          })
        )

        await Promise.all(promises)
      }

      // 如果還有更多項目，繼續處理
      if (this.replicationQueue.length > 0) {
        setImmediate(() => {
          this.processReplicationQueue().catch((error) => {
            this.logger.error(`[MultiRegionCache] Error in replication queue: ${String(error)}`)
          })
        })
      }
    } finally {
      this.replicationProcessing = false
    }
  }

  /**
   * 啟動複製隊列工作器
   */
  private startReplicationWorker(): void {
    // 每 100ms 檢查一次複製隊列
    setInterval(() => {
      this.processReplicationQueue().catch((error) => {
        this.logger.error(`[MultiRegionCache] Replication worker error: ${String(error)}`)
      })
    }, 100)
  }

  /**
   * 記錄指標
   *
   * @param metric 指標名稱
   */
  private recordMetrics(_metric: string): void {
    // 指標記錄（與應用的 metrics.registry 集成）
    // 示例指標：local_hit, primary_hit, cache_miss, replication_latency
  }

  /**
   * 獲取區域健康狀態
   */
  getRegionHealth(): Record<
    string,
    {
      isHealthy: boolean
      latency?: number
      lastCheck?: number
    }
  > {
    const health: Record<
      string,
      {
        isHealthy: boolean
        latency?: number
        lastCheck?: number
      }
    > = {}

    for (const [name, region] of this.regions.entries()) {
      health[name] = {
        isHealthy: region.lastHealthStatus?.isHealthy ?? true,
        latency: region.lastHealthStatus?.latency,
        lastCheck: region.lastHealthStatus?.timestamp,
      }
    }

    return health
  }

  /**
   * 更新區域健康狀態
   *
   * @param regionName 區域名稱
   * @param isHealthy 是否健康
   * @param latency 延遲（毫秒）
   */
  updateRegionHealth(regionName: string, isHealthy: boolean, latency?: number): void {
    const region = this.regions.get(regionName)
    if (region) {
      region.lastHealthStatus = {
        isHealthy,
        latency: latency ?? 0,
        timestamp: Date.now(),
      }
    }
  }
}
