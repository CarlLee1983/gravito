/**
 * Middleware type definitions for notification channels.
 *
 * 中介層允許在通知發送前後執行自訂邏輯，例如：
 * - 限流（Rate Limiting）
 * - 日誌記錄
 * - 資料轉換
 * - 權限檢查
 * - 錯誤處理
 *
 * @packageDocumentation
 */

import type { Notification } from '../Notification'
import type { Notifiable } from '../types'

/**
 * 中介層優先級常數
 *
 * 提供預定義的優先級值，用於控制中介層的執行順序。
 * 優先級越高（數字越大）越先執行。
 *
 * @example
 * ```typescript
 * const securityMiddleware: ChannelMiddleware = {
 *   name: 'security',
 *   priority: MiddlewarePriority.SECURITY, // 最高優先級，最先執行
 *   async handle(notification, notifiable, channel, next) {
 *     // 安全檢查...
 *     await next()
 *   }
 * }
 * ```
 *
 * @public
 */
export const MiddlewarePriority = {
  /** 最高優先級：安全檢查 (100) */
  SECURITY: 100,
  /** 高優先級：限流 (80) */
  RATE_LIMIT: 80,
  /** 中等優先級：驗證 (50) */
  VALIDATION: 50,
  /** 預設優先級 (0) */
  DEFAULT: 0,
  /** 低優先級：日誌記錄 (-50) */
  LOGGING: -50,
  /** 最低優先級：監控 (-100) */
  MONITORING: -100,
} as const

/**
 * 中介層優先級值型別
 *
 * @public
 */
export type MiddlewarePriorityValue = (typeof MiddlewarePriority)[keyof typeof MiddlewarePriority]

/**
 * Channel middleware interface.
 *
 * 中介層提供一個統一的擴展機制，允許在通知發送到特定通道時執行額外的邏輯。
 * 中介層可以：
 * - 在發送前檢查或修改通知
 * - 決定是否允許發送（透過是否呼叫 next）
 * - 在發送後執行清理或記錄操作
 *
 * @example
 * ```typescript
 * // 建立一個記錄中介層
 * const loggingMiddleware: ChannelMiddleware = {
 *   name: 'logging',
 *   async handle(notification, notifiable, channel, next) {
 *     console.log(`Sending ${notification.constructor.name} via ${channel}`)
 *     await next()
 *     console.log(`Sent successfully`)
 *   }
 * }
 *
 * // 註冊到 NotificationManager
 * manager.use(loggingMiddleware)
 * ```
 *
 * @public
 */
export interface ChannelMiddleware {
  /**
   * Middleware name (for debugging and identification).
   *
   * 中介層名稱，用於除錯和識別。
   */
  name: string

  /**
   * Middleware priority (optional, default: 0).
   *
   * 中介層優先級，數字越大越先執行。
   * 預設為 0。相同優先級的中介層按照註冊順序執行。
   *
   * @default 0
   *
   * @example
   * ```typescript
   * // 安全檢查應該最先執行
   * const securityMiddleware: ChannelMiddleware = {
   *   name: 'security',
   *   priority: MiddlewarePriority.SECURITY, // 100
   *   async handle(notification, notifiable, channel, next) {
   *     // 檢查權限...
   *     await next()
   *   }
   * }
   *
   * // 限流應該在安全檢查之後
   * const rateLimitMiddleware: ChannelMiddleware = {
   *   name: 'rate-limit',
   *   priority: MiddlewarePriority.RATE_LIMIT, // 80
   *   async handle(notification, notifiable, channel, next) {
   *     // 檢查限流...
   *     await next()
   *   }
   * }
   *
   * // 日誌記錄應該最後執行
   * const loggingMiddleware: ChannelMiddleware = {
   *   name: 'logging',
   *   priority: MiddlewarePriority.LOGGING, // -50
   *   async handle(notification, notifiable, channel, next) {
   *     console.log('Sending...')
   *     await next()
   *     console.log('Sent!')
   *   }
   * }
   * ```
   */
  priority?: number

  /**
   * Handle the notification before it's sent to the channel.
   *
   * 處理通知發送請求。此方法會在通知發送到通道之前被呼叫。
   *
   * @param notification - The notification instance being sent
   * @param notifiable - The recipient of the notification
   * @param channel - The channel name (e.g., 'mail', 'sms')
   * @param next - Call this function to continue the middleware chain and send the notification
   *
   * @throws {Error} 可以拋出錯誤來阻止通知發送
   *
   * @example
   * ```typescript
   * async handle(notification, notifiable, channel, next) {
   *   // 發送前的邏輯
   *   if (shouldBlock(channel)) {
   *     throw new Error('Channel blocked')
   *   }
   *
   *   // 繼續執行
   *   await next()
   *
   *   // 發送後的邏輯
   *   console.log('Sent successfully')
   * }
   * ```
   */
  handle(
    notification: Notification,
    notifiable: Notifiable,
    channel: string,
    next: () => Promise<void>
  ): Promise<void>
}
