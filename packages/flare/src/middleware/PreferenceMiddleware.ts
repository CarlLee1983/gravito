/**
 * User preference middleware for notification channels.
 *
 * 此中介層根據用戶的偏好設定過濾通知通道和通知類型，
 * 讓用戶可以自訂接收通知的方式。
 *
 * @packageDocumentation
 */

import type { Notification } from '../Notification'
import type { Notifiable, NotificationPreference } from '../types'
import { type ChannelMiddleware, MiddlewarePriority } from '../types/middleware'

/**
 * User preference middleware for filtering notification channels.
 *
 * 此中介層根據用戶的偏好設定過濾通知，支援：
 * - 啟用特定通道（enabledChannels）
 * - 禁用特定通道（disabledChannels，優先於 enabledChannels）
 * - 禁用特定通知類型（disabledNotifications）
 *
 * @example
 * ```typescript
 * // 使用 Notifiable 的偏好設定
 * const middleware = new PreferenceMiddleware()
 * manager.use(middleware)
 *
 * // 使用自定義偏好提供者
 * const dbProvider: NotificationPreference = {
 *   async getUserPreferences(notifiable) {
 *     return await db.getUserPrefs(notifiable.getNotifiableId())
 *   }
 * }
 * const middleware = new PreferenceMiddleware(dbProvider)
 * manager.use(middleware)
 * ```
 *
 * @public
 */
export class PreferenceMiddleware implements ChannelMiddleware {
  /**
   * Middleware name.
   */
  readonly name = 'preference'

  /**
   * Middleware priority (medium priority for validation).
   * 中介層優先級（中等優先級，用於驗證）
   */
  readonly priority = MiddlewarePriority.VALIDATION

  /**
   * Create a new PreferenceMiddleware instance.
   *
   * @param preferenceProvider - 可選的偏好提供者，如果未提供則使用 Notifiable 上的方法
   * @param logger - 可選的 logger 實例，用於記錄錯誤訊息
   *
   * @example
   * ```typescript
   * // 不使用提供者（從 Notifiable.getNotificationPreferences 讀取）
   * const middleware = new PreferenceMiddleware()
   *
   * // 使用資料庫提供者和 logger
   * const middleware = new PreferenceMiddleware(new DatabasePreferenceProvider(), logger)
   * ```
   */
  constructor(
    private preferenceProvider?: NotificationPreference,
    private logger?: { error: (message: string, ...args: unknown[]) => void }
  ) {}

  /**
   * Handle the notification and apply user preference filtering.
   *
   * 處理通知並根據用戶偏好進行過濾。過濾規則：
   * 1. 如果通知類型在 disabledNotifications 中，跳過
   * 2. 如果通道在 disabledChannels 中，跳過
   * 3. 如果設定了 enabledChannels，只允許列表中的通道
   * 4. 如果載入偏好失敗，容錯處理並允許發送
   *
   * @param notification - 要發送的通知
   * @param notifiable - 接收者
   * @param channel - 通道名稱
   * @param next - 繼續到下一個中介層或發送通知
   */
  async handle(
    notification: Notification,
    notifiable: Notifiable,
    channel: string,
    next: () => Promise<void>
  ): Promise<void> {
    try {
      // 獲取用戶偏好設定
      const preferences = await this.getPreferences(notifiable)

      // 如果沒有偏好設定，允許所有通知
      if (!preferences) {
        await next()
        return
      }

      // 檢查通知類型是否被禁用
      if (this.isNotificationDisabled(notification, preferences)) {
        // 跳過此通知
        return
      }

      // 檢查通道是否被允許
      if (!this.isChannelAllowed(channel, preferences)) {
        // 跳過此通道
        return
      }

      // 所有檢查通過，繼續執行
      await next()
    } catch (error) {
      // 偏好載入失敗時，記錄錯誤但不阻止通知發送（容錯機制）
      const errorMessage =
        `[PreferenceMiddleware] Failed to load preferences for ${notifiable.getNotifiableId()}, ` +
        `allowing notification to proceed:`

      if (this.logger) {
        this.logger.error(errorMessage, error)
      } else {
        console.error(errorMessage, error)
      }

      await next()
    }
  }

  /**
   * Get user preferences from Notifiable or custom provider.
   *
   * 從 Notifiable 或自定義提供者獲取用戶偏好。
   * 優先順序：Notifiable.getNotificationPreferences > preferenceProvider
   *
   * @param notifiable - 接收者
   * @returns 用戶偏好設定，如果沒有則返回 null
   *
   * @private
   */
  private async getPreferences(notifiable: Notifiable): Promise<{
    enabledChannels?: string[]
    disabledChannels?: string[]
    disabledNotifications?: string[]
  } | null> {
    // 優先使用 Notifiable 上的方法
    if (notifiable.getNotificationPreferences) {
      const prefs = await notifiable.getNotificationPreferences()
      return prefs || null
    }

    // 使用自定義提供者
    if (this.preferenceProvider) {
      const prefs = await this.preferenceProvider.getUserPreferences(notifiable)
      return prefs || null
    }

    // 沒有任何偏好設定
    return null
  }

  /**
   * Check if notification type is disabled by user.
   *
   * 檢查通知類型是否被用戶禁用。
   *
   * @param notification - 通知實例
   * @param preferences - 用戶偏好設定
   * @returns true 表示通知被禁用，應該跳過
   *
   * @private
   */
  private isNotificationDisabled(
    notification: Notification,
    preferences: {
      disabledNotifications?: string[]
    }
  ): boolean {
    const { disabledNotifications } = preferences

    if (!disabledNotifications || disabledNotifications.length === 0) {
      return false
    }

    const notificationName = notification.constructor.name
    return disabledNotifications.includes(notificationName)
  }

  /**
   * Check if channel is allowed by user preferences.
   *
   * 檢查通道是否被允許。優先級：
   * 1. disabledChannels 優先（如果在列表中，則禁用）
   * 2. enabledChannels（如果設定，只允許列表中的通道）
   * 3. 如果都沒設定，允許所有通道
   *
   * @param channel - 通道名稱
   * @param preferences - 用戶偏好設定
   * @returns true 表示通道被允許
   *
   * @private
   */
  private isChannelAllowed(
    channel: string,
    preferences: {
      enabledChannels?: string[]
      disabledChannels?: string[]
    }
  ): boolean {
    const { enabledChannels, disabledChannels } = preferences

    // 檢查是否在禁用列表中（優先級最高）
    if (disabledChannels && disabledChannels.length > 0) {
      if (disabledChannels.includes(channel)) {
        return false
      }
    }

    // 檢查是否在啟用列表中
    if (enabledChannels && enabledChannels.length > 0) {
      return enabledChannels.includes(channel)
    }

    // 如果啟用列表是空陣列，拒絕所有通道
    if (enabledChannels !== undefined && enabledChannels.length === 0) {
      return false
    }

    // 沒有任何限制，允許所有通道
    return true
  }
}
