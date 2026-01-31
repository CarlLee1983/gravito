/**
 * FlareHooks 型別定義
 *
 * 提供型別安全的 hook 事件系統，包含所有通知相關的 hook 事件和 payload 型別。
 *
 * @packageDocumentation
 */

import type { Notification } from '../Notification'
import type { Notifiable, SendResult } from '../types'

/**
 * FlareHooks 事件名稱列舉
 *
 * 包含所有通知系統支援的 hook 事件。
 *
 * @public
 */
export type FlareHookEvent =
  | 'notification:sending'
  | 'notification:queued'
  | 'notification:sent'
  | 'notification:channel:sending'
  | 'notification:channel:sent'
  | 'notification:channel:failed'
  | 'notification:channel:retry'
  | 'notification:batch:start'
  | 'notification:batch:complete'

/**
 * 各 hook 事件的 Payload 型別映射
 *
 * 定義每個 hook 事件對應的 payload 結構，提供完整的型別安全。
 *
 * @example
 * ```typescript
 * // 監聽通知發送事件
 * hooks.on('notification:sending', (payload: FlareHookPayloads['notification:sending']) => {
 *   console.log(`Sending ${payload.notification.constructor.name} to ${payload.notifiable.getNotifiableId()}`)
 * })
 * ```
 *
 * @public
 */
export interface FlareHookPayloads {
  /**
   * 通知開始發送前觸發
   */
  'notification:sending': {
    /** 要發送的通知實例 */
    notification: Notification
    /** 接收通知的對象 */
    notifiable: Notifiable
    /** 要發送的通道列表 */
    channels: string[]
  }

  /**
   * 通知被加入佇列時觸發
   */
  'notification:queued': {
    /** 要發送的通知實例 */
    notification: Notification
    /** 接收通知的對象 */
    notifiable: Notifiable
    /** 要發送的通道列表 */
    channels: string[]
  }

  /**
   * 通知發送完成後觸發
   */
  'notification:sent': {
    /** 已發送的通知實例 */
    notification: Notification
    /** 接收通知的對象 */
    notifiable: Notifiable
    /** 各通道的發送結果 */
    results: SendResult[]
    /** 是否所有通道都發送成功 */
    allSuccess: boolean
    /** 總執行時間（毫秒） */
    totalDuration: number
  }

  /**
   * 通道開始發送前觸發
   */
  'notification:channel:sending': {
    /** 要發送的通知實例 */
    notification: Notification
    /** 接收通知的對象 */
    notifiable: Notifiable
    /** 通道名稱 */
    channel: string
  }

  /**
   * 通道發送成功後觸發
   */
  'notification:channel:sent': {
    /** 已發送的通知實例 */
    notification: Notification
    /** 接收通知的對象 */
    notifiable: Notifiable
    /** 通道名稱 */
    channel: string
    /** 發送耗時（毫秒） */
    duration: number
  }

  /**
   * 通道發送失敗時觸發
   */
  'notification:channel:failed': {
    /** 發送失敗的通知實例 */
    notification: Notification
    /** 接收通知的對象 */
    notifiable: Notifiable
    /** 通道名稱 */
    channel: string
    /** 錯誤物件 */
    error: Error
    /** 發送耗時（毫秒） */
    duration: number
  }

  /**
   * 通道重試時觸發
   */
  'notification:channel:retry': {
    /** 要重試的通知實例 */
    notification: Notification
    /** 接收通知的對象 */
    notifiable: Notifiable
    /** 通道名稱 */
    channel: string
    /** 錯誤物件 */
    error: Error
    /** 當前重試次數 */
    attempt: number
    /** 下次重試延遲（毫秒） */
    nextDelay: number
  }

  /**
   * 批次發送開始時觸發
   */
  'notification:batch:start': {
    /** 要發送的通知實例 */
    notification: Notification
    /** 接收者數量 */
    count: number
  }

  /**
   * 批次發送完成時觸發
   */
  'notification:batch:complete': {
    /** 已發送的通知實例 */
    notification: Notification
    /** 總接收者數量 */
    total: number
    /** 成功數量 */
    success: number
    /** 失敗數量 */
    failed: number
    /** 總執行時間（毫秒） */
    duration: number
  }
}

/**
 * FlareHooks 介面
 *
 * 提供型別安全的 hook 系統介面，用於發送和監聽通知事件。
 *
 * @remarks
 * 此介面主要用於型別檢查，實際的 hook 系統由 @gravito/core 提供。
 *
 * @example
 * ```typescript
 * // 發送型別安全的 hook 事件
 * const emitter = createHookEmitter(core)
 * await emitter.emit('notification:sending', {
 *   notification,
 *   notifiable,
 *   channels: ['mail', 'sms']
 * })
 * ```
 *
 * @public
 */
export interface FlareHooks {
  /**
   * 發送 hook 事件
   *
   * @param event - 事件名稱
   * @param payload - 事件 payload，型別由事件名稱決定
   */
  emit<E extends FlareHookEvent>(event: E, payload: FlareHookPayloads[E]): Promise<void>

  /**
   * 監聽 hook 事件
   *
   * @param event - 事件名稱
   * @param handler - 事件處理函數
   */
  on<E extends FlareHookEvent>(event: E, handler: (payload: FlareHookPayloads[E]) => void): void

  /**
   * 移除 hook 事件監聽器
   *
   * @param event - 事件名稱
   * @param handler - 要移除的事件處理函數
   */
  off<E extends FlareHookEvent>(event: E, handler: (payload: FlareHookPayloads[E]) => void): void
}
