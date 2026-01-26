import type { IncomingWebhookRecord, OutgoingWebhookRecord } from '../storage/WebhookStore'

/**
 * 死信隊列介面
 */
export interface DeadLetterQueue {
  /**
   * 加入失敗事件
   */
  enqueue(event: DeadLetterEvent): Promise<string>

  /**
   * 取得待處理事件
   */
  peek(limit?: number): Promise<DeadLetterEvent[]>

  /**
   * 移除已處理事件
   */
  dequeue(id: string): Promise<void>

  /**
   * 取得佇列長度
   */
  size(): Promise<number>

  /**
   * 清空佇列
   */
  clear(): Promise<void>
}

/**
 * 死信事件
 */
export interface DeadLetterEvent {
  id?: string
  type: 'incoming' | 'outgoing'
  originalEvent: IncomingWebhookRecord | OutgoingWebhookRecord
  failureReason: string
  failedAt: Date
  retryCount: number
  lastRetryAt?: Date
}
