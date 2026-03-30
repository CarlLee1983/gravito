import type { EventOptions } from './EventOptions'
import type { EventTask } from './types'

/**
 * 優先級升級管理器
 *
 * 根據事件等待時間動態調整優先級，實施優先級提升機制。
 * 確保關鍵事件不會因為隊列深度而長時間等待。
 *
 * 升級規則（可配置）：
 * - LOW 等待 > 200ms → NORMAL
 * - NORMAL 等待 > 100ms → HIGH
 * - HIGH 等待 > 50ms → CRITICAL
 * - 超過 maxWaitTimeMs → 強制 CRITICAL
 *
 * @internal
 */
export class PriorityEscalationManager {
  /**
   * 計算事件當前應該的優先級
   * 根據等待時間動態調整
   */
  static calculateCurrentPriority(
    task: EventTask,
    config?: EventOptions['escalation']
  ): 'critical' | 'high' | 'normal' | 'low' {
    // 如果未啟用升級，返回原始優先級
    if (config?.enabled === false) {
      return (task.options.priority as 'critical' | 'high' | 'normal' | 'low') || 'normal'
    }

    const nowMs = Date.now()
    const waitTimeMs = nowMs - task.enqueuedAt
    const maxWaitTimeMs = config?.maxWaitTimeMs ?? 500

    // 超過最大等待時間，強制 CRITICAL
    if (waitTimeMs > maxWaitTimeMs) {
      return 'critical'
    }

    const defaultThresholds = {
      lowToNormal: 200,
      normalToHigh: 100,
      highToCritical: 50,
    }
    const thresholds = { ...defaultThresholds, ...config?.thresholds }

    const currentPriority = (task.options.priority as 'critical' | 'high' | 'normal' | 'low') || 'normal'

    // LOW → NORMAL（等待 > 200ms）
    if (currentPriority === 'low' && waitTimeMs > thresholds.lowToNormal) {
      return 'normal'
    }

    // NORMAL → HIGH（等待 > 100ms）
    if (currentPriority === 'normal' && waitTimeMs > thresholds.normalToHigh) {
      return 'high'
    }

    // HIGH → CRITICAL（等待 > 50ms）
    if (currentPriority === 'high' && waitTimeMs > thresholds.highToCritical) {
      return 'critical'
    }

    return currentPriority
  }

  /**
   * 比較兩個事件的優先級
   * @returns 負數表示 task1 優先級更高，正數表示 task2 優先級更高
   */
  static comparePriority(task1: EventTask, task2: EventTask): number {
    const priority1 = (task1.options.priority as 'critical' | 'high' | 'normal' | 'low') || 'normal'
    const priority2 = (task2.options.priority as 'critical' | 'high' | 'normal' | 'low') || 'normal'

    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    }

    // 按優先級排序
    const priorityDiff = priorityOrder[priority1] - priorityOrder[priority2]
    if (priorityDiff !== 0) {
      return priorityDiff
    }

    // 優先級相同時，按入隊時間排序（先進先出）
    return task1.enqueuedAt - task2.enqueuedAt
  }

  /**
   * 判斷事件是否應該立即處理（跳過隊列）
   */
  static shouldProcessImmediately(task: EventTask, config?: EventOptions['escalation']): boolean {
    const currentPriority = this.calculateCurrentPriority(task, config)
    return currentPriority === 'critical'
  }

  /**
   * 獲取事件當前的超期時間（毫秒）
   * 正數表示已超期，0 表示未超期
   */
  static calculateOverdueTime(task: EventTask, config?: EventOptions['escalation']): number {
    const nowMs = Date.now()
    const waitTimeMs = nowMs - task.enqueuedAt
    const currentPriority = this.calculateCurrentPriority(task, config)

    const expectedDelays: Record<string, number> = {
      critical: 1,
      high: 50,
      normal: 200,
      low: 500,
    }

    const expectedDelay = expectedDelays[currentPriority] ?? 500
    return Math.max(0, waitTimeMs - expectedDelay)
  }
}

/**
 * 優先級統計器
 * 追蹤優先級分布和升級事件
 *
 * @internal
 */
export class PriorityStatistics {
  private eventCounts: Record<'critical' | 'high' | 'normal' | 'low', number> = {
    critical: 0,
    high: 0,
    normal: 0,
    low: 0,
  }

  private escalationCounts: Map<string, number> = new Map()
  private totalEscalations = 0

  /**
   * 記錄一個優先級的事件
   */
  recordEvent(priority: 'critical' | 'high' | 'normal' | 'low'): void {
    this.eventCounts[priority] = (this.eventCounts[priority] ?? 0) + 1
  }

  /**
   * 記錄優先級升級
   */
  recordEscalation(
    fromPriority: 'critical' | 'high' | 'normal' | 'low',
    toPriority: 'critical' | 'high' | 'normal' | 'low'
  ): void {
    if (fromPriority === toPriority) {
      return
    }
    const key = `${fromPriority}->${toPriority}`
    this.escalationCounts.set(key, (this.escalationCounts.get(key) ?? 0) + 1)
    this.totalEscalations++
  }

  /**
   * 獲取優先級分布
   */
  getDistribution(): Record<'critical' | 'high' | 'normal' | 'low', string> {
    const total = Object.values(this.eventCounts).reduce((a, b) => a + b, 0)
    if (total === 0) {
      return {
        critical: '0%',
        high: '0%',
        normal: '0%',
        low: '0%',
      }
    }

    return {
      critical: `${((this.eventCounts.critical / total) * 100).toFixed(2)}%`,
      high: `${((this.eventCounts.high / total) * 100).toFixed(2)}%`,
      normal: `${((this.eventCounts.normal / total) * 100).toFixed(2)}%`,
      low: `${((this.eventCounts.low / total) * 100).toFixed(2)}%`,
    }
  }

  /**
   * 獲取升級統計
   */
  getEscalationStats(): {
    total: number
    byTransition: Record<string, number>
  } {
    return {
      total: this.totalEscalations,
      byTransition: Object.fromEntries(this.escalationCounts),
    }
  }

  /**
   * 重置統計信息
   */
  reset(): void {
    this.eventCounts = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
    }
    this.escalationCounts.clear()
    this.totalEscalations = 0
  }

  /**
   * 獲取所有統計信息
   */
  getStats(): {
    eventCounts: Record<'critical' | 'high' | 'normal' | 'low', number>
    escalationStats: {
      total: number
      byTransition: Record<string, number>
    }
    distribution: Record<'critical' | 'high' | 'normal' | 'low', string>
  } {
    return {
      eventCounts: this.eventCounts,
      escalationStats: this.getEscalationStats(),
      distribution: this.getDistribution(),
    }
  }
}
