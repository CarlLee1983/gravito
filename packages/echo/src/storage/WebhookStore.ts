/**
 * Webhook 事件儲存介面
 */
export interface WebhookStore {
  /**
   * 儲存接收的 Webhook 事件
   */
  saveIncomingEvent(event: IncomingWebhookRecord): Promise<string>

  /**
   * 儲存發送的 Webhook 紀錄
   */
  saveOutgoingEvent(event: OutgoingWebhookRecord): Promise<string>

  /**
   * 更新發送嘗試紀錄
   */
  updateDeliveryAttempt(id: string, attempt: DeliveryAttempt): Promise<void>

  /**
   * 取得事件詳情
   */
  getEvent(id: string): Promise<WebhookRecord | null>

  /**
   * 查詢事件
   */
  queryEvents(filter: EventQueryFilter): Promise<WebhookRecord[]>

  /**
   * 標記事件為已處理
   */
  markProcessed(id: string): Promise<void>

  /**
   * 標記事件為失敗
   */
  markFailed(id: string, error: string): Promise<void>
}

/**
 * 接收的 Webhook 紀錄
 */
export interface IncomingWebhookRecord {
  id?: string
  provider: string
  eventType: string
  payload: unknown
  headers: Record<string, string | undefined>
  rawBody: string
  receivedAt: Date
  status: 'pending' | 'processed' | 'failed'
  processingError?: string
  direction?: 'incoming'
}

/**
 * 發送的 Webhook 紀錄
 */
export interface OutgoingWebhookRecord {
  id?: string
  url: string
  event: string
  payload: unknown
  createdAt: Date
  status: 'pending' | 'delivered' | 'failed'
  attempts: DeliveryAttempt[]
  direction?: 'outgoing'
}

/**
 * 聯合類型 WebhookRecord
 */
export type WebhookRecord = IncomingWebhookRecord | OutgoingWebhookRecord

/**
 * 傳送嘗試紀錄
 */
export interface DeliveryAttempt {
  attemptNumber: number
  timestamp: Date
  statusCode?: number
  responseBody?: string
  error?: string
  duration: number
}

/**
 * 事件查詢過濾器
 */
export interface EventQueryFilter {
  direction?: 'incoming' | 'outgoing'
  provider?: string
  eventType?: string
  status?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}
