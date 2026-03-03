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
export declare class PriorityEscalationManager {
  /**
   * 計算事件當前應該的優先級
   * 根據等待時間動態調整
   */
  static calculateCurrentPriority(
    task: EventTask,
    config?: EventOptions['escalation']
  ): 'critical' | 'high' | 'normal' | 'low'
  /**
   * 比較兩個事件的優先級
   * @returns 負數表示 task1 優先級更高，正數表示 task2 優先級更高
   */
  static comparePriority(task1: EventTask, task2: EventTask): number
  /**
   * 判斷事件是否應該立即處理（跳過隊列）
   */
  static shouldProcessImmediately(task: EventTask, config?: EventOptions['escalation']): boolean
  /**
   * 獲取事件當前的超期時間（毫秒）
   * 正數表示已超期，0 表示未超期
   */
  static calculateOverdueTime(task: EventTask, config?: EventOptions['escalation']): number
}
/**
 * 優先級統計器
 * 追蹤優先級分布和升級事件
 *
 * @internal
 */
export declare class PriorityStatistics {
  private eventCounts
  private escalationCounts
  private totalEscalations
  /**
   * 記錄一個優先級的事件
   */
  recordEvent(priority: 'critical' | 'high' | 'normal' | 'low'): void
  /**
   * 記錄優先級升級
   */
  recordEscalation(
    fromPriority: 'critical' | 'high' | 'normal' | 'low',
    toPriority: 'critical' | 'high' | 'normal' | 'low'
  ): void
  /**
   * 獲取優先級分布
   */
  getDistribution(): Record<'critical' | 'high' | 'normal' | 'low', string>
  /**
   * 獲取升級統計
   */
  getEscalationStats(): {
    total: number
    byTransition: Record<string, number>
  }
  /**
   * 重置統計信息
   */
  reset(): void
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
  }
}
