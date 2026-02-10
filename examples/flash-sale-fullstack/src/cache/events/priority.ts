/**
 * 事件優先級管理器
 *
 * 根據事件特徵動態調整優先級，實施優先級提升機制
 */

import { type CacheEvent, EventPriority, PRIORITY_CONFIG } from './types'

/**
 * 優先級升級策略
 * 當事件等待時間超過 TTL 時自動升級
 */
export class PriorityEscalationManager {
  /**
   * 計算事件當前應該的優先級
   * 根據等待時間動態調整
   */
  static calculateCurrentPriority(event: CacheEvent): EventPriority {
    const now = Date.now()
    const waitTimeMs = now - event.timestamp
    const ttl = event.ttl ?? Infinity

    // 如果超過 TTL，升級到最高優先級
    if (waitTimeMs > ttl) {
      return EventPriority.CRITICAL
    }

    // 根據不同的優先級計算升級時間
    const currentPriority = event.priority

    // 低優先級事件：如果等待超過 200ms，升級
    if (
      currentPriority === EventPriority.LOW &&
      waitTimeMs > PRIORITY_CONFIG[EventPriority.NORMAL].windowMs
    ) {
      return EventPriority.NORMAL
    }

    // 普通優先級事件：如果等待超過 100ms，升級
    if (
      currentPriority === EventPriority.NORMAL &&
      waitTimeMs > PRIORITY_CONFIG[EventPriority.HIGH].windowMs
    ) {
      return EventPriority.HIGH
    }

    // 高優先級事件：如果等待超過 50ms，升級到關鍵
    if (
      currentPriority === EventPriority.HIGH &&
      waitTimeMs > PRIORITY_CONFIG[EventPriority.CRITICAL].delayMs + 50
    ) {
      return EventPriority.CRITICAL
    }

    return currentPriority
  }

  /**
   * 比較兩個事件的優先級
   * @returns 負數表示 event1 優先級更高，正數表示 event2 優先級更高
   */
  static comparePriority(event1: CacheEvent, event2: CacheEvent): number {
    const priority1 = this.calculateCurrentPriority(event1)
    const priority2 = this.calculateCurrentPriority(event2)

    const priorityOrder: Record<EventPriority, number> = {
      [EventPriority.CRITICAL]: 0,
      [EventPriority.HIGH]: 1,
      [EventPriority.NORMAL]: 2,
      [EventPriority.LOW]: 3,
    }

    // 按優先級排序
    const priorityDiff = priorityOrder[priority1] - priorityOrder[priority2]
    if (priorityDiff !== 0) {
      return priorityDiff
    }

    // 優先級相同時，按時間戳排序（先到先得）
    return event1.timestamp - event2.timestamp
  }

  /**
   * 檢查事件是否應該立即處理（跳過隊列）
   */
  static shouldProcessImmediately(event: CacheEvent): boolean {
    const currentPriority = this.calculateCurrentPriority(event)
    return currentPriority === EventPriority.CRITICAL
  }

  /**
   * 獲取優先級描述（用於日誌和監控）
   */
  static getPriorityDescription(priority: EventPriority): string {
    const descriptions: Record<EventPriority, string> = {
      [EventPriority.CRITICAL]: '關鍵（立即處理）',
      [EventPriority.HIGH]: '高（50ms 內）',
      [EventPriority.NORMAL]: '普通（200ms 內）',
      [EventPriority.LOW]: '低（500ms 內）',
    }
    return descriptions[priority]
  }

  /**
   * 計算事件的超期時間（毫秒）
   */
  static calculateOverdueTime(event: CacheEvent): number {
    const currentPriority = this.calculateCurrentPriority(event)
    const config = PRIORITY_CONFIG[currentPriority]
    const expectedDelay = config.delayMs
    const actualWaitTime = Date.now() - event.timestamp

    return Math.max(0, actualWaitTime - expectedDelay)
  }
}

/**
 * 優先級統計器
 * 追蹤優先級分布和性能指標
 */
export class PriorityStatistics {
  private readonly stats: Map<EventPriority, number> = new Map()

  constructor() {
    Object.values(EventPriority).forEach((priority) => {
      this.stats.set(priority, 0)
    })
  }

  /**
   * 記錄一個事件
   */
  recordEvent(event: CacheEvent): void {
    const priority = event.priority
    this.stats.set(priority, (this.stats.get(priority) ?? 0) + 1)
  }

  /**
   * 獲取優先級統計
   */
  getStats(): Record<EventPriority, number> {
    const result = {} as Record<EventPriority, number>
    Object.values(EventPriority).forEach((priority) => {
      result[priority] = this.stats.get(priority) ?? 0
    })
    return result
  }

  /**
   * 獲取總事件數
   */
  getTotalEvents(): number {
    return Array.from(this.stats.values()).reduce((a, b) => a + b, 0)
  }

  /**
   * 重置統計信息
   */
  reset(): void {
    Object.values(EventPriority).forEach((priority) => {
      this.stats.set(priority, 0)
    })
  }

  /**
   * 獲取優先級分布百分比
   */
  getDistribution(): Record<EventPriority, string> {
    const total = this.getTotalEvents()
    if (total === 0) {
      return {
        [EventPriority.CRITICAL]: '0%',
        [EventPriority.HIGH]: '0%',
        [EventPriority.NORMAL]: '0%',
        [EventPriority.LOW]: '0%',
      }
    }

    const result = {} as Record<EventPriority, string>
    Object.values(EventPriority).forEach((priority) => {
      const count = this.stats.get(priority) ?? 0
      const percentage = ((count / total) * 100).toFixed(2)
      result[priority] = `${percentage}%`
    })
    return result
  }
}
