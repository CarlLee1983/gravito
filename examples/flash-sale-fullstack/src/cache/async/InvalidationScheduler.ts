/**
 * 失效調度器
 *
 * 管理異步失效操作的調度
 * - 優先級隊列
 * - 延遲執行
 * - 批量調度
 * - 取消機制
 */

import type { CacheEvent, EventPriority } from '../events'

/**
 * 調度任務
 */
export interface ScheduledTask {
  id: string
  event: CacheEvent
  executionTime: number // 計劃執行時間
  createdAt: number // 創建時間
  priority: EventPriority
}

/**
 * 調度器統計
 */
export interface SchedulerStats {
  totalScheduled: number // 總調度任務數
  totalExecuted: number // 總執行任務數
  totalCancelled: number // 總取消任務數
  pendingCount: number // 待執行任務數
  averageWaitTime: number // 平均等待時間
}

/**
 * 失效調度器
 */
export class InvalidationScheduler {
  private tasks: Map<string, ScheduledTask> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private stats: SchedulerStats = {
    totalScheduled: 0,
    totalExecuted: 0,
    totalCancelled: 0,
    pendingCount: 0,
    averageWaitTime: 0,
  }

  private waitTimes: number[] = []
  private executionCallbacks: Map<string, (task: ScheduledTask) => Promise<void>> = new Map()

  /**
   * 調度一個失效任務
   *
   * @param event 失效事件
   * @param delayMs 延遲時間（毫秒）
   * @returns 任務 ID
   */
  schedule(event: CacheEvent, delayMs = 0): string {
    const taskId = `${event.id}:${Date.now()}`
    const executionTime = Date.now() + delayMs

    const task: ScheduledTask = {
      id: taskId,
      event,
      executionTime,
      createdAt: Date.now(),
      priority: event.priority,
    }

    this.tasks.set(taskId, task)
    this.stats.totalScheduled++
    this.stats.pendingCount++

    // 設置計時器
    if (delayMs > 0) {
      const timer = setTimeout(() => this.executeTask(taskId), delayMs)
      this.timers.set(taskId, timer)
    } else {
      // 立即執行
      this.executeTask(taskId)
    }

    return taskId
  }

  /**
   * 批量調度任務
   */
  scheduleBatch(events: CacheEvent[], delayMs = 0): string[] {
    return events.map((event) => this.schedule(event, delayMs))
  }

  /**
   * 取消已調度的任務
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    // 清除計時器
    const timer = this.timers.get(taskId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(taskId)
    }

    // 移除任務
    this.tasks.delete(taskId)
    this.stats.totalCancelled++
    this.stats.pendingCount--

    return true
  }

  /**
   * 批量取消任務
   */
  cancelBatch(taskIds: string[]): number {
    let cancelled = 0
    for (const taskId of taskIds) {
      if (this.cancel(taskId)) {
        cancelled++
      }
    }
    return cancelled
  }

  /**
   * 取消所有待執行任務
   */
  cancelAll(): number {
    const taskIds = Array.from(this.tasks.keys())
    return this.cancelBatch(taskIds)
  }

  /**
   * 註冊執行回調
   */
  onExecution(taskId: string, callback: (task: ScheduledTask) => Promise<void>): void {
    this.executionCallbacks.set(taskId, callback)
  }

  /**
   * 註冊全局執行回調
   */
  onAnyExecution(callback: (task: ScheduledTask) => Promise<void>): void {
    // 使用特殊 ID 表示全局回調
    this.executionCallbacks.set('__global__', callback)
  }

  /**
   * 執行任務
   */
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) {
      return
    }

    try {
      // 計算等待時間
      const waitTime = Date.now() - task.createdAt
      this.waitTimes.push(waitTime)
      if (this.waitTimes.length > 1000) {
        this.waitTimes.shift()
      }

      // 執行特定的回調
      const callback = this.executionCallbacks.get(taskId)
      if (callback) {
        await callback(task)
      }

      // 執行全局回調
      const globalCallback = this.executionCallbacks.get('__global__')
      if (globalCallback) {
        await globalCallback(task)
      }

      this.stats.totalExecuted++
    } catch (error) {
      console.error(`[InvalidationScheduler] Task execution failed: ${taskId}`, error)
    } finally {
      // 清理任務
      this.tasks.delete(taskId)
      this.timers.delete(taskId)
      this.stats.pendingCount--

      // 更新平均等待時間
      if (this.waitTimes.length > 0) {
        const sum = this.waitTimes.reduce((a, b) => a + b, 0)
        this.stats.averageWaitTime = sum / this.waitTimes.length
      }
    }
  }

  /**
   * 獲取待執行任務列表
   */
  getPendingTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * 獲取特定優先級的待執行任務
   */
  getTasksByPriority(priority: EventPriority): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.priority === priority)
  }

  /**
   * 獲取統計信息
   */
  getStats(): SchedulerStats {
    return { ...this.stats }
  }

  /**
   * 重置統計信息
   */
  resetStats(): void {
    this.stats.totalScheduled = 0
    this.stats.totalExecuted = 0
    this.stats.totalCancelled = 0
    this.stats.averageWaitTime = 0
    this.waitTimes = []
  }

  /**
   * 獲取任務詳細信息
   */
  getTaskDetail(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 檢查任務是否存在
   */
  hasTask(taskId: string): boolean {
    return this.tasks.has(taskId)
  }

  /**
   * 清空所有任務和計時器
   */
  clear(): void {
    // 清除所有計時器
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }

    this.tasks.clear()
    this.timers.clear()
    this.stats.pendingCount = 0
  }

  /**
   * 優雅關閉
   */
  async shutdown(): Promise<void> {
    // 等待所有待執行任務完成
    await new Promise((resolve) => {
      if (this.stats.pendingCount === 0) {
        resolve(null)
      } else {
        // 設置一個檢查間隔
        const interval = setInterval(() => {
          if (this.stats.pendingCount === 0) {
            clearInterval(interval)
            resolve(null)
          }
        }, 100)

        // 最多等待 30 秒
        setTimeout(() => {
          clearInterval(interval)
          resolve(null)
        }, 30000)
      }
    })

    // 清空所有資源
    this.clear()
  }
}
