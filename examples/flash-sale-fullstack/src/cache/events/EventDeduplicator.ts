/**
 * 事件去重器
 *
 * 合併相同模式的事件，減少快取失效次數
 * - 模式聚合：將相同模式的事件合併
 * - 模式優化：合併重疊模式
 * - 去重率追蹤：監控去重效率
 */

import type { CacheEvent } from './types'

/**
 * 去重統計
 */
export interface DeduplicationStats {
  totalEvents: number // 總事件數
  deduplicatedEvents: number // 去重後事件數
  removedCount: number // 移除的事件數
  patternsAggregated: number // 聚合的模式數
  deduplicationRate: number // 去重率 (%)
}

/**
 * 事件去重器
 */
export class EventDeduplicator {
  // 模式 -> 事件映射，用於去重和聚合
  private patternMap: Map<string, CacheEvent> = new Map()

  // 統計信息
  private stats: DeduplicationStats = {
    totalEvents: 0,
    deduplicatedEvents: 0,
    removedCount: 0,
    patternsAggregated: 0,
    deduplicationRate: 0,
  }

  /**
   * 添加事件，自動去重
   *
   * 規則：
   * 1. 相同模式的事件合併為一個
   * 2. 優先級高的事件保留，低優先級的移除
   * 3. 新事件如果優先級更高，替換舊事件
   */
  addEvent(event: CacheEvent): void {
    this.stats.totalEvents++

    // 遍歷事件的所有模式
    for (const pattern of event.patterns) {
      const existing = this.patternMap.get(pattern)

      if (!existing) {
        // 新模式，直接添加
        this.patternMap.set(pattern, event)
      } else {
        // 模式已存在，判斷是否需要替換
        const priorityOrder: Record<string, number> = {
          critical: 0,
          high: 1,
          normal: 2,
          low: 3,
        }

        const existingPriority = priorityOrder[existing.priority]
        const newPriority = priorityOrder[event.priority]

        if (newPriority < existingPriority) {
          // 新事件優先級更高，替換
          this.patternMap.set(pattern, event)
          this.stats.removedCount++
        } else if (newPriority === existingPriority) {
          // 優先級相同，保持最舊的（或時間戳早的）
          if (event.timestamp < existing.timestamp) {
            this.patternMap.set(pattern, event)
          }
        }
        // 否則保持現有事件，新事件被丟棄
        this.stats.removedCount++
      }
    }

    // 更新統計
    this.stats.deduplicatedEvents = this.patternMap.size
    this.stats.patternsAggregated = this.patternMap.size
    this.updateDeduplicationRate()
  }

  /**
   * 批量添加事件
   */
  addEvents(events: CacheEvent[]): void {
    for (const event of events) {
      this.addEvent(event)
    }
  }

  /**
   * 獲取所有去重後的事件
   * 每個返回的事件包含合併後的所有模式
   */
  getDeduplicated(): CacheEvent[] {
    // 重新組織為事件 ID -> 事件的映射
    const eventMap = new Map<string, CacheEvent>()

    for (const event of this.patternMap.values()) {
      const existing = eventMap.get(event.id)

      if (!existing) {
        // 複製事件，避免修改原始對象
        eventMap.set(event.id, { ...event, patterns: [] })
      }

      // 添加模式
      const patterns = eventMap.get(event.id)!.patterns
      event.patterns.forEach((p) => {
        if (!patterns.includes(p)) {
          patterns.push(p)
        }
      })
    }

    return Array.from(eventMap.values())
  }

  /**
   * 優化模式 - 將重疊的模式合併
   *
   * 例如：['product:1', 'product:2', 'product:3'] -> ['product:*']
   */
  optimizePatterns(patterns: string[]): string[] {
    if (patterns.length < 3) {
      return patterns
    }

    // 簡單的優化：檢查是否可以用通配符替代多個具體模式
    const optimized: string[] = []
    const byPrefix = new Map<string, string[]>()

    // 按前綴分組
    for (const pattern of patterns) {
      const parts = pattern.split(':')
      const prefix = parts[0]

      if (!byPrefix.has(prefix)) {
        byPrefix.set(prefix, [])
      }
      byPrefix.get(prefix)!.push(pattern)
    }

    // 如果某個前綴的模式數 > 50%，用通配符替代
    const threshold = Math.ceil(patterns.length * 0.5)

    for (const [prefix, patternList] of byPrefix.entries()) {
      if (patternList.length >= threshold) {
        // 用通配符替代
        optimized.push(`${prefix}:*`)
      } else {
        // 保留原有模式
        optimized.push(...patternList)
      }
    }

    return optimized
  }

  /**
   * 清空去重器
   */
  clear(): void {
    this.patternMap.clear()
    this.stats.totalEvents = 0
    this.stats.deduplicatedEvents = 0
    this.stats.removedCount = 0
    this.stats.patternsAggregated = 0
    this.stats.deduplicationRate = 0
  }

  /**
   * 獲取統計信息
   */
  getStats(): DeduplicationStats {
    return { ...this.stats }
  }

  /**
   * 重置統計信息（但保留去重數據）
   */
  resetStats(): void {
    this.stats.totalEvents = 0
    this.stats.removedCount = 0
    this.stats.deduplicationRate = 0
    this.updateDeduplicationRate()
  }

  /**
   * 獲取去重率百分比
   */
  getDeduplicationRate(): number {
    return this.stats.deduplicationRate
  }

  /**
   * 獲取模式數量
   */
  getPatternCount(): number {
    return this.patternMap.size
  }

  /**
   * 獲取特定模式的事件
   */
  getEventForPattern(pattern: string): CacheEvent | undefined {
    return this.patternMap.get(pattern)
  }

  /**
   * 檢查是否存在某個模式
   */
  hasPattern(pattern: string): boolean {
    return this.patternMap.has(pattern)
  }

  /**
   * 移除特定模式
   */
  removePattern(pattern: string): boolean {
    return this.patternMap.delete(pattern)
  }

  /**
   * 按模式通配符移除
   */
  removePatternByPrefix(prefix: string): number {
    let removed = 0
    const toDelete: string[] = []

    for (const pattern of this.patternMap.keys()) {
      if (pattern.startsWith(prefix)) {
        toDelete.push(pattern)
      }
    }

    for (const pattern of toDelete) {
      this.patternMap.delete(pattern)
      removed++
    }

    return removed
  }

  /**
   * 獲取所有模式
   */
  getPatterns(): string[] {
    return Array.from(this.patternMap.keys())
  }

  /**
   * 查找匹配某個失效模式的所有事件
   * 支持通配符匹配
   */
  findEventsByPattern(invalidationPattern: string): CacheEvent[] {
    const result: Set<CacheEvent> = new Set()

    // 精確匹配
    const exact = this.patternMap.get(invalidationPattern)
    if (exact) {
      result.add(exact)
    }

    // 通配符匹配
    if (invalidationPattern.includes('*')) {
      const regex = this.patternToRegex(invalidationPattern)
      for (const [pattern, event] of this.patternMap.entries()) {
        if (regex.test(pattern)) {
          result.add(event)
        }
      }
    }

    return Array.from(result)
  }

  /**
   * 更新去重率
   */
  private updateDeduplicationRate(): void {
    if (this.stats.totalEvents === 0) {
      this.stats.deduplicationRate = 0
    } else {
      this.stats.deduplicationRate = ((this.stats.removedCount / this.stats.totalEvents) * 100) | 0
    }
  }

  /**
   * 將模式轉換為正則表達式
   */
  private patternToRegex(pattern: string): RegExp {
    // 轉義特殊字符，除了 *
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
    return new RegExp(`^${escaped}$`)
  }

  /**
   * 用於測試的內部方法
   */
  __getPatternMap(): Map<string, CacheEvent> {
    return new Map(this.patternMap)
  }
}
