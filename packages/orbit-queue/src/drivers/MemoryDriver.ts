import type { SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Memory Driver
 *
 * 記憶體驅動，用於開發和測試。
 * 所有資料儲存在記憶體中，應用程式重啟後會丟失。
 *
 * **零配置啟動**：無需任何配置即可使用。
 *
 * @example
 * ```typescript
 * const driver = new MemoryDriver()
 * await driver.push('default', serializedJob)
 * const job = await driver.pop('default')
 * ```
 */
export class MemoryDriver implements QueueDriver {
  private queues = new Map<string, SerializedJob[]>()

  /**
   * 推送 Job 到隊列
   */
  async push(queue: string, job: SerializedJob): Promise<void> {
    if (!this.queues.has(queue)) {
      this.queues.set(queue, [])
    }
    this.queues.get(queue)?.push(job)
  }

  /**
   * 從隊列取出 Job（FIFO）
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    const queueJobs = this.queues.get(queue)
    if (!queueJobs || queueJobs.length === 0) {
      return null
    }

    // 檢查是否有延遲的 Job
    const now = Date.now()
    const availableIndex = queueJobs.findIndex(
      (job) => !job.delaySeconds || now >= job.createdAt + job.delaySeconds * 1000
    )

    if (availableIndex === -1) {
      return null
    }

    return queueJobs.splice(availableIndex, 1)[0]!
  }

  /**
   * 取得隊列大小
   */
  async size(queue: string): Promise<number> {
    return this.queues.get(queue)?.length ?? 0
  }

  /**
   * 清空隊列
   */
  async clear(queue: string): Promise<void> {
    this.queues.delete(queue)
  }

  /**
   * 批量推送 Job
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (!this.queues.has(queue)) {
      this.queues.set(queue, [])
    }
    this.queues.get(queue)?.push(...jobs)
  }

  /**
   * 批量取出 Job
   */
  async popMany(queue: string, count: number): Promise<SerializedJob[]> {
    const results: SerializedJob[] = []
    for (let i = 0; i < count; i++) {
      const job = await this.pop(queue)
      if (job) {
        results.push(job)
      } else {
        break
      }
    }
    return results
  }
}
