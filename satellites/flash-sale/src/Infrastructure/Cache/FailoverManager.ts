/**
 * FailoverManager
 *
 * 處理多區域部署的健康檢查和故障轉移
 * - 定期健康檢查（10 秒間隔）
 * - 延遲監控
 * - 自動故障轉移（< 10 秒）
 */

import type { Logger } from '@gravito/core'
import type { MultiRegionCacheService, RegionConfig } from './MultiRegionCacheService'

/**
 * 健康狀態
 */
interface HealthStatus {
  isHealthy: boolean
  lastCheck: number
  latency?: number
  error?: string
  status?: number
}

/**
 * 健康檢查配置
 */
export interface HealthCheckConfig {
  interval: number // 檢查間隔（毫秒）
  timeout: number // 檢查超時（毫秒）
  retries: number // 失敗重試次數
  unhealthyThreshold: number // 標記為不健康的連續失敗次數
}

/**
 * FailoverManager
 *
 * 監控區域健康狀態並自動故障轉移
 */
export class FailoverManager {
  private healthChecks: Map<string, HealthStatus> = new Map()
  private consecutiveFailures: Map<string, number> = new Map()
  private checkInterval?: NodeJS.Timeout
  private config: HealthCheckConfig
  private multiRegionCache?: any

  constructor(
    private regionConfigs: RegionConfig[],
    multiRegionCache: any,
    private logger: Logger,
    config?: Partial<HealthCheckConfig>
  ) {
    this.multiRegionCache = multiRegionCache
    this.config = {
      interval: config?.interval ?? 10000, // 默認 10 秒
      timeout: config?.timeout ?? 5000, // 默認 5 秒超時
      retries: config?.retries ?? 2,
      unhealthyThreshold: config?.unhealthyThreshold ?? 3,
    }

    this.initializeHealthStatus()
    this.startHealthChecks()
  }

  /**
   * 初始化所有區域的健康狀態
   */
  private initializeHealthStatus(): void {
    for (const config of this.regionConfigs) {
      this.healthChecks.set(config.name, {
        isHealthy: true,
        lastCheck: Date.now(),
      })
      this.consecutiveFailures.set(config.name, 0)
    }
  }

  /**
   * 啟動定期健康檢查
   */
  private startHealthChecks(): void {
    // 清除現有的檢查間隔（如果有）
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = setInterval(() => {
      this.performHealthChecks().catch((error) => {
        this.logger.error(`[FailoverManager] Health check error: ${String(error)}`)
      })
    }, this.config.interval)

    // 立即執行一次健康檢查
    this.performHealthChecks().catch((error) => {
      this.logger.error(`[FailoverManager] Initial health check error: ${String(error)}`)
    })
  }

  /**
   * 執行健康檢查
   */
  private async performHealthChecks(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const config of this.regionConfigs) {
      promises.push(this.checkRegionHealth(config))
    }

    await Promise.all(promises)
  }

  /**
   * 檢查單個區域的健康狀態
   *
   * @param config 區域配置
   */
  private async checkRegionHealth(config: RegionConfig): Promise<void> {
    const regionName = config.name

    try {
      const startTime = performance.now()

      // 執行健康檢查請求（帶超時）
      const response = await this.fetchWithTimeout(config.healthCheckUrl, {
        timeout: this.config.timeout,
      })

      const latency = performance.now() - startTime

      // 更新健康狀態
      if (response.ok) {
        this.healthChecks.set(regionName, {
          isHealthy: true,
          lastCheck: Date.now(),
          latency,
          status: response.status,
        })

        // 重置連續失敗計數
        this.consecutiveFailures.set(regionName, 0)

        // 如果之前是不健康的，記錄恢復
        if (!this.healthChecks.get(regionName)?.isHealthy) {
          this.logger.info(`[FailoverManager] Region ${regionName} recovered`)
        }

        this.multiRegionCache.updateRegionHealth(regionName, true, latency)
      } else {
        this.handleHealthCheckFailure(config, `HTTP ${response.status}`)
      }
    } catch (error) {
      this.handleHealthCheckFailure(config, String(error))
    }
  }

  /**
   * 處理健康檢查失敗
   *
   * @param config 區域配置
   * @param error 錯誤信息
   */
  private handleHealthCheckFailure(config: RegionConfig, error: string): void {
    const regionName = config.name
    const failures = (this.consecutiveFailures.get(regionName) ?? 0) + 1

    this.consecutiveFailures.set(regionName, failures)

    // 如果連續失敗次數超過閾值，標記為不健康
    if (failures >= this.config.unhealthyThreshold) {
      const currentStatus = this.healthChecks.get(regionName)
      if (currentStatus?.isHealthy !== false) {
        this.logger.warn(
          `[FailoverManager] Region ${regionName} marked as unhealthy after ${failures} failures: ${error}`
        )
      }

      this.healthChecks.set(regionName, {
        isHealthy: false,
        lastCheck: Date.now(),
        error,
      })

      this.multiRegionCache.updateRegionHealth(regionName, false)
    } else {
      this.logger.debug(
        `[FailoverManager] Health check failed for region ${regionName} (${failures}/${this.config.unhealthyThreshold}): ${error}`
      )
    }
  }

  /**
   * 帶超時的 fetch 請求
   *
   * @param url 請求 URL
   * @param options 請求選項
   * @returns 響應
   */
  private async fetchWithTimeout(
    url: string,
    options: { timeout: number } & RequestInit
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 獲取所有區域的健康狀態
   *
   * @returns 區域名稱 => 健康狀態的映射
   */
  getAllHealthStatus(): Record<string, HealthStatus> {
    const status: Record<string, HealthStatus> = {}

    for (const [name, health] of this.healthChecks.entries()) {
      status[name] = health
    }

    return status
  }

  /**
   * 獲取特定區域的健康狀態
   *
   * @param regionName 區域名稱
   * @returns 健康狀態
   */
  getRegionHealthStatus(regionName: string): HealthStatus | undefined {
    return this.healthChecks.get(regionName)
  }

  /**
   * 選擇最佳區域進行查詢
   *
   * 優先級：
   * 1. 優選區域（如果健康）
   * 2. 延遲最低的健康區域
   * 3. 任何健康區域
   * 4. 最後健康檢查最近的區域
   *
   * @param preferredRegion 優選區域名稱
   * @returns 區域配置
   */
  selectBestRegion(preferredRegion?: string): RegionConfig {
    // 1. 如果優選區域健康，使用它
    if (preferredRegion) {
      const preferred = this.regionConfigs.find((r) => r.name === preferredRegion)
      if (preferred && this.isRegionHealthy(preferred.name)) {
        return preferred
      }
    }

    // 2. 選擇健康且延遲最低的區域
    const healthyRegions = this.regionConfigs.filter((r) => this.isRegionHealthy(r.name))

    if (healthyRegions.length > 0) {
      return healthyRegions.sort((a, b) => {
        const aLatency = this.healthChecks.get(a.name)?.latency ?? Infinity
        const bLatency = this.healthChecks.get(b.name)?.latency ?? Infinity
        return aLatency - bLatency
      })[0]!
    }

    // 3. 回退到任何區域（最後健康檢查最近的）
    return this.regionConfigs.sort((a, b) => {
      const aCheck = this.healthChecks.get(a.name)?.lastCheck ?? 0
      const bCheck = this.healthChecks.get(b.name)?.lastCheck ?? 0
      return bCheck - aCheck
    })[0]!
  }

  /**
   * 檢查區域是否健康
   *
   * @param regionName 區域名稱
   * @returns 是否健康
   */
  private isRegionHealthy(regionName: string): boolean {
    return this.healthChecks.get(regionName)?.isHealthy ?? false
  }

  /**
   * 停止健康檢查
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = undefined
      this.logger.info('[FailoverManager] Health checks stopped')
    }
  }

  /**
   * 手動標記區域為不健康
   *
   * @param regionName 區域名稱
   */
  markUnhealthy(regionName: string): void {
    const config = this.regionConfigs.find((r) => r.name === regionName)
    if (config) {
      this.logger.warn(`[FailoverManager] Region ${regionName} manually marked as unhealthy`)
      this.healthChecks.set(regionName, {
        isHealthy: false,
        lastCheck: Date.now(),
        error: 'Manual failover',
      })
      this.multiRegionCache.updateRegionHealth(regionName, false)
    }
  }

  /**
   * 手動標記區域為健康
   *
   * @param regionName 區域名稱
   */
  markHealthy(regionName: string): void {
    const config = this.regionConfigs.find((r) => r.name === regionName)
    if (config) {
      this.logger.info(`[FailoverManager] Region ${regionName} manually marked as healthy`)
      this.healthChecks.set(regionName, {
        isHealthy: true,
        lastCheck: Date.now(),
      })
      this.consecutiveFailures.set(regionName, 0)
      this.multiRegionCache.updateRegionHealth(regionName, true)
    }
  }
}
