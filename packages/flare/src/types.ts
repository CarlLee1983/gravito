/**
 * Notification system type definitions.
 */

import type { Notification } from './Notification'

/**
 * 支援取消的發送選項
 *
 * 用於在發送通知時支援 AbortController 取消功能。
 *
 * @example
 * ```typescript
 * const controller = new AbortController()
 * setTimeout(() => controller.abort(), 5000)
 *
 * await channel.send(notification, notifiable, {
 *   signal: controller.signal
 * })
 * ```
 *
 * @public
 */
export interface AbortableSendOptions {
  /**
   * AbortSignal 用於取消請求
   *
   * 當 signal 被 abort 時，底層的網路請求（如 fetch）會被取消。
   * 這對於實作 timeout 或使用者主動取消特別有用。
   */
  signal?: AbortSignal
}

/**
 * Notification channel interface.
 * @public
 */
export interface NotificationChannel {
  /**
   * Send a notification through the specified channel.
   *
   * @param notification - The notification instance containing data.
   * @param notifiable - The recipient of the notification.
   * @param options - Optional abort options (v4.0.0+)
   */
  send(
    notification: Notification,
    notifiable: Notifiable,
    options?: AbortableSendOptions
  ): Promise<void>
}

/**
 * Interface for recipients that can receive notifications.
 * @public
 */
export interface Notifiable {
  /**
   * Unique identifier for the recipient (e.g., User ID).
   */
  getNotifiableId(): string | number

  /**
   * Optional recipient type (useful for polymorphic notifications).
   */
  getNotifiableType?(): string

  /**
   * Optional list of preferred channels for this specific recipient.
   */
  preferredNotificationChannels?(): string[]

  /**
   * Optional notification preferences for this specific recipient.
   * 取得用戶的通知偏好設定，用於控制通知的發送行為。
   */
  getNotificationPreferences?(): Promise<{
    /** 啟用的通道列表（如果設定，則只允許這些通道） */
    enabledChannels?: string[]
    /** 禁用的通道列表（優先於 enabledChannels） */
    disabledChannels?: string[]
    /** 禁用的通知類型列表（Notification class names） */
    disabledNotifications?: string[]
  }>
}

/**
 * Payload for email notifications.
 * @public
 */
export interface MailMessage {
  /** Email subject line */
  subject: string
  /** View template path */
  view?: string
  /** Data to pass to the view template */
  data?: Record<string, unknown>
  /** Inline HTML content */
  html?: string
  /** Plain text content */
  text?: string
  /** Sender address */
  from?: string
  /** Target recipient(s) */
  to?: string | string[]
  /** Carbon copy recipient(s) */
  cc?: string | string[]
  /** Blind carbon copy recipient(s) */
  bcc?: string | string[]
}

/**
 * Payload for database-stored notifications.
 * @public
 */
export interface DatabaseNotification {
  /** Type identifier for the notification */
  type: string
  /** JSON-serializable data payload */
  data: Record<string, unknown>
  /** Timestamp when the notification was marked as read */
  readAt?: Date | null
}

/**
 * Payload for real-time broadcast notifications.
 * @public
 */
export interface BroadcastNotification {
  /** Event/Type identifier for the broadcast */
  type: string
  /** Data to be broadcasted to subscribers */
  data: Record<string, unknown>
}

/**
 * Payload for Slack channel notifications.
 * @public
 */
export interface SlackMessage {
  /** Main message text */
  text: string
  /** Target Slack channel */
  channel?: string
  /** Custom bot username */
  username?: string
  /** Icon emoji for the bot */
  iconEmoji?: string
  /** Array of Slack attachments for rich formatting */
  attachments?: Array<{
    color?: string
    title?: string
    text?: string
    fields?: Array<{ title: string; value: string; short?: boolean }>
  }>
}

/**
 * Payload for SMS notifications.
 * @public
 */
export interface SmsMessage {
  /** Recipient phone number */
  to: string
  /** Message content */
  message: string
  /** Sender ID or phone number */
  from?: string
}

/**
 * Result of a single channel delivery attempt.
 * @public
 */
export interface SendResult {
  success: boolean
  channel: string
  error?: Error
  duration?: number
}

/**
 * Aggregated result of a notification delivery.
 * @public
 */
export interface NotificationResult {
  notification: string
  notifiable: string | number
  results: SendResult[]
  allSuccess: boolean
  timestamp: Date
}

/**
 * Options for sending notifications.
 * @public
 */
export interface SendOptions {
  /** If true, throws an AggregateError when any channel fails */
  throwOnError?: boolean
  /** Whether to send to channels in parallel (default: true) */
  parallel?: boolean
  /** Maximum number of concurrent channel sends (default: unlimited) */
  concurrency?: number
  /** Retry configuration */
  retry?: Partial<RetryConfig> | boolean
}

/**
 * Retry configuration options.
 * @public
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts: number
  /** Base delay in milliseconds (default: 1000) */
  baseDelay: number
  /** Backoff strategy: 'fixed' | 'linear' | 'exponential' (default: 'exponential') */
  backoff: 'fixed' | 'linear' | 'exponential'
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay: number
  /** Function to determine if an error is retryable */
  retryableErrors?: (error: Error) => boolean
}

/**
 * Interface for notifications that should retry on failure.
 * @public
 */
export interface ShouldRetry {
  /** Retry configuration for this notification */
  retry?: Partial<RetryConfig>
}

/**
 * Result of a batch notification delivery.
 * @public
 */
export interface BatchResult {
  total: number
  success: number
  failed: number
  results: NotificationResult[]
  duration: number
}

// Hook Payloads

export interface NotificationHookPayload {
  notification: Notification
  notifiable: Notifiable
  channels: string[]
}

export interface ChannelHookPayload {
  notification: Notification
  notifiable: Notifiable
  channel: string
}

export interface ChannelSuccessPayload extends ChannelHookPayload {
  duration: number
}

export interface ChannelFailurePayload extends ChannelHookPayload {
  error: Error
  duration: number
}

export interface NotificationCompletePayload {
  notification: Notification
  notifiable: Notifiable
  results: SendResult[]
  allSuccess: boolean
  totalDuration: number
}

export interface NotificationBatchStartPayload {
  notification: Notification
  count: number
}

export interface NotificationBatchCompletePayload {
  notification: Notification
  total: number
  success: number
  failed: number
  duration: number
}

// Service Interfaces (for OrbitFlare type safety)

export interface MailService {
  send(message: MailMessage): Promise<void>
}

export interface DatabaseService {
  insertNotification(data: {
    notifiableId: string | number
    notifiableType: string
    type: string
    data: Record<string, unknown>
  }): Promise<void>
}

export interface BroadcastService {
  broadcast(channel: string, event: string, data: Record<string, unknown>): Promise<void>
}

export interface QueueService {
  push(job: unknown, queue?: string, connection?: string, delay?: number): Promise<void>
}

/**
 * Notification preference provider interface.
 *
 * 用於提供用戶通知偏好的介面。可以從資料庫、快取或其他來源載入用戶的偏好設定。
 *
 * @public
 */
export interface NotificationPreference {
  /**
   * Get user notification preferences.
   *
   * 獲取用戶的通知偏好設定。
   *
   * @param notifiable - 接收通知的用戶
   * @returns 用戶的通知偏好設定
   *
   * @example
   * ```typescript
   * class DatabasePreferenceProvider implements NotificationPreference {
   *   async getUserPreferences(notifiable: Notifiable) {
   *     const prefs = await db.query(
   *       'SELECT * FROM user_preferences WHERE user_id = ?',
   *       [notifiable.getNotifiableId()]
   *     )
   *     return {
   *       enabledChannels: prefs.enabled_channels,
   *       disabledChannels: prefs.disabled_channels,
   *       disabledNotifications: prefs.disabled_notifications
   *     }
   *   }
   * }
   * ```
   */
  getUserPreferences(notifiable: Notifiable): Promise<{
    /** 啟用的通道列表（如果設定，則只允許這些通道） */
    enabledChannels: string[]
    /** 禁用的通道列表（優先於 enabledChannels） */
    disabledChannels: string[]
    /** 禁用的通知類型列表（Notification class names） */
    disabledNotifications: string[]
  }>
}
