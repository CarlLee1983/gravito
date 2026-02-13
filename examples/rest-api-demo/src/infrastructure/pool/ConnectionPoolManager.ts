/**
 * 連接池管理器
 *
 * 功能：
 * 1. 連接池預熱
 * 2. 健康檢查
 * 3. 自適應池大小調整
 * 4. 性能監控
 */

export interface PoolMetrics {
  active: number // 活躍連接數
  idle: number // 空閒連接數
  waiting: number // 等待連接的請求數
  totalCreated: number // 累計建立的連接數
  totalDestroyed: number // 累計銷毀的連接數
  avgWaitTime: number // 平均等待時間
  avgConnectionTime: number // 平均連接時間
}

export interface PoolConfig {
  minSize: number
  maxSize: number
  idleTimeout: number
  maxWaitTime: number
  healthCheckInterval: number
  warningThreshold: number // 連接利用率告警閾值
}

export interface PoolHealthStatus {
  isHealthy: boolean
  activeConnections: number
  idleConnections: number
  utilization: number // 利用率百分比
  warning?: string
  recommendation?: string
}

export class ConnectionPoolManager {
  private metrics: PoolMetrics = {
    active: 0,
    idle: 0,
    waiting: 0,
    totalCreated: 0,
    totalDestroyed: 0,
    avgWaitTime: 0,
    avgConnectionTime: 0,
  }

  private config: PoolConfig
  private healthCheckTimer?: NodeJS.Timeout
  private queryHistory: Array<{ duration: number; timestamp: number }> = []

  constructor(
    private connection: any,
    config: PoolConfig
  ) {
    this.config = config
  }

  /**
   * 預熱連接池
   */
  async warmup(): Promise<void> {
    console.log(`[Pool] 開始預熱... (目標: ${this.config.minSize} 個連接)`)

    const startTime = Date.now()
    const connections: any[] = []

    try {
      // 建立最少數量的連接
      for (let i = 0; i < this.config.minSize; i++) {
        try {
          const conn = await this.connection.acquire()
          connections.push(conn)
          this.metrics.totalCreated++
          console.log(`[Pool] 建立連接 ${i + 1}/${this.config.minSize}`)
        } catch (error) {
          console.error(`[Pool] 預熱失敗 (連接 ${i + 1}):`, error)
        }
      }

      // 歸還連接
      for (const conn of connections) {
        try {
          await this.connection.release(conn)
          this.metrics.idle++
        } catch (error) {
          console.error('[Pool] 歸還連接失敗:', error)
        }
      }

      const duration = Date.now() - startTime
      console.log(
        `[Pool] ✅ 預熱完成 (耗時: ${duration}ms, 活躍: ${this.metrics.active}, 空閒: ${this.metrics.idle})`
      )
    } catch (error) {
      console.error('[Pool] 預熱過程出錯:', error)
      throw error
    }
  }

  /**
   * 啟動健康檢查
   */
  startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      const status = await this.checkHealth()

      if (!status.isHealthy) {
        console.warn(`[Pool] ⚠️ 連接池異常: ${status.warning}`)
      }

      if (status.utilization > this.config.warningThreshold) {
        console.warn(`[Pool] ⚠️ 連接利用率過高: ${status.utilization.toFixed(2)}%`)
        if (status.recommendation) {
          console.log(`[Pool] 建議: ${status.recommendation}`)
        }
      }
    }, this.config.healthCheckInterval)
  }

  /**
   * 檢查連接池健康狀況
   */
  async checkHealth(): Promise<PoolHealthStatus> {
    try {
      // 嘗試獲取一個連接
      const conn = await this.connection.acquire()

      // 執行簡單的測試查詢
      await conn.query('SELECT 1')

      // 歸還連接
      await this.connection.release(conn)

      const total = this.metrics.active + this.metrics.idle
      const utilization = total > 0 ? (this.metrics.active / total) * 100 : 0

      return {
        isHealthy: true,
        activeConnections: this.metrics.active,
        idleConnections: this.metrics.idle,
        utilization: Math.round(utilization * 100) / 100,
      }
    } catch (error) {
      return {
        isHealthy: false,
        activeConnections: this.metrics.active,
        idleConnections: this.metrics.idle,
        utilization: 100,
        warning: `健康檢查失敗: ${String(error)}`,
        recommendation: '檢查數據庫連接配置和網絡連接',
      }
    }
  }

  /**
   * 記錄查詢性能
   */
  recordQuery(duration: number): void {
    this.queryHistory.push({
      duration,
      timestamp: Date.now(),
    })

    // 只保留最近 1000 個查詢
    if (this.queryHistory.length > 1000) {
      this.queryHistory = this.queryHistory.slice(-1000)
    }

    // 更新平均值
    this.updateMetrics()
  }

  /**
   * 更新指標
   */
  private updateMetrics(): void {
    if (this.queryHistory.length === 0) {
      return
    }

    // 計算平均查詢時間（最近 100 個查詢）
    const recentQueries = this.queryHistory.slice(-100)
    const totalDuration = recentQueries.reduce((sum, q) => sum + q.duration, 0)
    this.metrics.avgConnectionTime = Math.round(totalDuration / recentQueries.length)

    // 計算平均等待時間（基於查詢密集度）
    const now = Date.now()
    const recentQueriesWindow = this.queryHistory.filter((q) => now - q.timestamp < 10000)
    const queryRate = recentQueriesWindow.length // 最近 10 秒的查詢數
    this.metrics.avgWaitTime = queryRate > 0 ? Math.round(1000 / queryRate) : 0
  }

  /**
   * 自適應調整池大小
   */
  async adaptPoolSize(): Promise<void> {
    const status = await this.checkHealth()
    const utilization = status.utilization

    // =========================================================================
    // 決策：根據利用率調整池大小
    // =========================================================================
    if (utilization > 80 && this.metrics.active < this.config.maxSize) {
      // 利用率過高，增加連接
      const newSize = Math.min(this.metrics.active + 5, this.config.maxSize)
      console.log(
        `[Pool] 增加連接 (當前: ${this.metrics.active}, 目標: ${newSize}, 利用率: ${utilization.toFixed(2)}%)`
      )
      this.metrics.active = newSize
    } else if (utilization < 30 && this.metrics.idle > this.config.minSize) {
      // 利用率過低，減少連接
      const newSize = Math.max(this.metrics.idle - 3, this.config.minSize)
      console.log(
        `[Pool] 減少連接 (當前: ${this.metrics.idle}, 目標: ${newSize}, 利用率: ${utilization.toFixed(2)}%)`
      )
      this.metrics.idle = newSize
    }
  }

  /**
   * 獲取連接池指標
   */
  getMetrics(): PoolMetrics {
    return { ...this.metrics }
  }

  /**
   * 獲取池狀態摘要
   */
  getStatus(): string {
    const total = this.metrics.active + this.metrics.idle
    const utilization = total > 0 ? ((this.metrics.active / total) * 100).toFixed(2) : '0'

    return (
      `[Pool Status]\n` +
      `- Active: ${this.metrics.active}/${total}\n` +
      `- Utilization: ${utilization}%\n` +
      `- Avg Query Time: ${this.metrics.avgConnectionTime}ms\n` +
      `- Avg Wait Time: ${this.metrics.avgWaitTime}ms\n` +
      `- Total Created: ${this.metrics.totalCreated}\n` +
      `- Total Destroyed: ${this.metrics.totalDestroyed}`
    )
  }

  /**
   * 優雅關閉
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    console.log('[Pool] 關閉連接池...')
    try {
      await this.connection.destroy()
      console.log('[Pool] ✅ 連接池已關閉')
    } catch (error) {
      console.error('[Pool] 關閉失敗:', error)
    }
  }
}
