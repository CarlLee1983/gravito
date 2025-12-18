import type { SerializedJob, TopicOptions } from '../types'

/**
 * Queue Driver 介面
 *
 * 所有隊列驅動都必須實作此介面。
 * 這個介面定義了基本的隊列操作，以及可選的企業級功能。
 *
 * @example
 * ```typescript
 * class MyDriver implements QueueDriver {
 *   async push(queue: string, job: SerializedJob): Promise<void> {
 *     // 推送 Job 到隊列
 *   }
 *
 *   async pop(queue: string): Promise<SerializedJob | null> {
 *     // 從隊列取出 Job
 *   }
 *
 *   async size(queue: string): Promise<number> {
 *     // 取得隊列大小
 *   }
 *
 *   async clear(queue: string): Promise<void> {
 *     // 清空隊列
 *   }
 * }
 * ```
 */
export interface QueueDriver {
  /**
   * 推送 Job 到隊列
   * @param queue - 隊列名稱
   * @param job - 序列化後的 Job
   */
  push(queue: string, job: SerializedJob): Promise<void>

  /**
   * 從隊列取出 Job（非阻塞）
   * @param queue - 隊列名稱
   * @returns 序列化後的 Job，如果隊列為空則返回 null
   */
  pop(queue: string): Promise<SerializedJob | null>

  /**
   * 取得隊列大小
   * @param queue - 隊列名稱
   * @returns 隊列中的 Job 數量
   */
  size(queue: string): Promise<number>

  /**
   * 清空隊列
   * @param queue - 隊列名稱
   */
  clear(queue: string): Promise<void>

  /**
   * 批量推送 Job（可選，高效能）
   * @param queue - 隊列名稱
   * @param jobs - 序列化後的 Job 陣列
   */
  pushMany?(queue: string, jobs: SerializedJob[]): Promise<void>

  /**
   * 批量取出 Job（可選，高效能）
   * @param queue - 隊列名稱
   * @param count - 要取出的數量
   * @returns 序列化後的 Job 陣列
   */
  popMany?(queue: string, count: number): Promise<SerializedJob[]>

  /**
   * 確認消息已處理（企業級功能，Kafka、SQS 等支援）
   * @param messageId - 消息 ID
   */
  acknowledge?(messageId: string): Promise<void>

  /**
   * 訂閱隊列（Push-based 模式，Kafka、SQS 等支援）
   * @param queue - 隊列名稱
   * @param callback - 處理 Job 的回調函數
   */
  subscribe?(queue: string, callback: (job: SerializedJob) => Promise<void>): Promise<void>

  /**
   * 建立 Topic（Kafka 等支援）
   * @param topic - Topic 名稱
   * @param options - Topic 選項
   */
  createTopic?(topic: string, options?: TopicOptions): Promise<void>

  /**
   * 刪除 Topic（Kafka 等支援）
   * @param topic - Topic 名稱
   */
  deleteTopic?(topic: string): Promise<void>
}
