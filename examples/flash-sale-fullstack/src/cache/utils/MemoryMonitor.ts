/**
 * 快取記憶體監控器
 * 追蹤記憶體使用量，檢測異常情況，並提供診斷功能
 */

export interface MemoryStats {
  totalBytes: number
  entryCount: number
  avgEntrySize: number
  utilizationPercent: number
  hitRate: number
}

export interface MemoryThresholds {
  warning: number
  critical: number
}

export class MemoryMonitor {
  private maxMemoryBytes: number
  private thresholds: MemoryThresholds
  private onWarning?: (stats: MemoryStats) => void
  private onCritical?: (stats: MemoryStats) => void

  constructor(
    maxMemoryMB: number,
    thresholds?: Partial<MemoryThresholds>,
    callbacks?: {
      onWarning?: (stats: MemoryStats) => void
      onCritical?: (stats: MemoryStats) => void
    }
  ) {
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024
    this.thresholds = {
      warning: thresholds?.warning ?? 0.8,
      critical: thresholds?.critical ?? 0.95,
    }
    this.onWarning = callbacks?.onWarning
    this.onCritical = callbacks?.onCritical
  }

  /**
   * 計算快取記憶體使用量
   * @param cache 快取 Map
   * @param hitRate 快取命中率（可選）
   * @returns 記憶體統計
   */
  calculateMemoryUsage<T>(cache: Map<string, T>, hitRate?: number): MemoryStats {
    let totalBytes = 0

    for (const [key, value] of cache.entries()) {
      // 估算大小：key + JSON 序列化後的值
      totalBytes += key.length * 2 // UTF-16 編碼
      totalBytes += JSON.stringify(value).length * 2
    }

    const entryCount = cache.size
    const avgEntrySize = entryCount > 0 ? totalBytes / entryCount : 0
    const utilizationPercent = (totalBytes / this.maxMemoryBytes) * 100

    return {
      totalBytes,
      entryCount,
      avgEntrySize,
      utilizationPercent,
      hitRate: hitRate ?? 0,
    }
  }

  /**
   * 檢查並觸發告警
   * @param stats 記憶體統計
   */
  checkAndAlert(stats: MemoryStats): void {
    const utilization = stats.utilizationPercent / 100

    if (utilization >= this.thresholds.critical && this.onCritical) {
      this.onCritical(stats)
    } else if (utilization >= this.thresholds.warning && this.onWarning) {
      this.onWarning(stats)
    }
  }

  /**
   * 獲取診斷報告
   * @param stats 記憶體統計
   * @returns 診斷信息字符串
   */
  getDiagnostics(stats: MemoryStats): string {
    const usedMB = (stats.totalBytes / 1024 / 1024).toFixed(2)
    const maxMB = (this.maxMemoryBytes / 1024 / 1024).toFixed(2)
    const avgKB = (stats.avgEntrySize / 1024).toFixed(2)

    return `
Memory Diagnostics:
- Total: ${usedMB} MB / ${maxMB} MB
- Entries: ${stats.entryCount}
- Avg Size: ${avgKB} KB
- Utilization: ${stats.utilizationPercent.toFixed(2)}%
- Hit Rate: ${stats.hitRate.toFixed(2)}%
    `.trim()
  }

  /**
   * 評估記憶體健康狀態
   * @param stats 記憶體統計
   * @returns 健康狀態（'healthy' | 'warning' | 'critical'）
   */
  getHealthStatus(stats: MemoryStats): 'healthy' | 'warning' | 'critical' {
    const utilization = stats.utilizationPercent / 100

    if (utilization >= this.thresholds.critical) {
      return 'critical'
    }
    if (utilization >= this.thresholds.warning) {
      return 'warning'
    }
    return 'healthy'
  }

  /**
   * 更新閾值配置
   * @param thresholds 新的閾值
   */
  updateThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * 獲取最大記憶體大小
   * @returns 最大記憶體字節數
   */
  getMaxMemory(): number {
    return this.maxMemoryBytes
  }

  /**
   * 估算可以容納的條目數（基於平均大小）
   * @param avgEntrySize 平均條目大小（字節）
   * @returns 估計的條目容量
   */
  estimateCapacity(avgEntrySize: number): number {
    if (avgEntrySize <= 0) {
      return 0
    }
    return Math.floor(this.maxMemoryBytes / avgEntrySize)
  }
}
