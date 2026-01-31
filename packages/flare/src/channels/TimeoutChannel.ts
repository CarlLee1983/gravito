import type { Notification } from '../Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel } from '../types'

/**
 * Timeout 配置選項。
 */
export interface TimeoutConfig {
  /**
   * Timeout 時間（毫秒）。
   */
  timeout: number

  /**
   * Timeout 發生時的回調函數。
   * @param channel - Channel 名稱
   * @param notification - 通知實例
   */
  onTimeout?: (channel: string, notification: Notification) => void
}

/**
 * Timeout 錯誤類別。
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Abort 錯誤類別。
 *
 * 當請求被外部 AbortController 取消時拋出。
 */
export class AbortError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AbortError'
  }
}

/**
 * Timeout Channel 裝飾器（v4.0.0 支援真正的請求取消）
 *
 * 為任何 NotificationChannel 加上 timeout 功能。
 * 使用 AbortController 實現真正的請求取消，並結合 Promise.race 確保及時拋出錯誤。
 *
 * @example
 * ```ts
 * const slackChannel = new SlackChannel(config)
 * const timeoutChannel = new TimeoutChannel(slackChannel, {
 *   timeout: 5000, // 5 秒
 *   onTimeout: (channel, notification) => {
 *     console.log(`Channel ${channel} timeout`)
 *   }
 * })
 *
 * // 使用 timeout
 * await timeoutChannel.send(notification, user)
 *
 * // 支援外部 abort
 * const controller = new AbortController()
 * setTimeout(() => controller.abort(), 3000)
 * await timeoutChannel.send(notification, user, { signal: controller.signal })
 * ```
 *
 * @remarks
 * v4.0.0 新增：使用 AbortController 讓底層 fetch 請求可以被真正取消，
 * 同時使用 Promise.race 確保 timeout 時立即拋出錯誤，不等待底層請求完成。
 */
export class TimeoutChannel implements NotificationChannel {
  constructor(
    private inner: NotificationChannel,
    private config: TimeoutConfig
  ) {}

  async send(
    notification: Notification,
    notifiable: Notifiable,
    options?: AbortableSendOptions
  ): Promise<void> {
    // 如果 timeout <= 0，立即拋出錯誤
    if (this.config.timeout <= 0) {
      if (this.config.onTimeout) {
        this.config.onTimeout(this.inner.constructor.name, notification)
      }
      throw new TimeoutError(`Notification send timeout after ${this.config.timeout}ms`)
    }

    // 建立 AbortController
    const controller = new AbortController()
    const { signal } = controller

    // 如果外部傳入 signal，監聽它
    if (options?.signal) {
      if (options.signal.aborted) {
        throw new AbortError('Request was aborted before sending')
      }
      options.signal.addEventListener('abort', () => {
        controller.abort()
      })
    }

    // 建立 timeout Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        if (this.config.onTimeout) {
          this.config.onTimeout(this.inner.constructor.name, notification)
        }
        controller.abort()

        // 判斷是 timeout 還是外部 abort
        if (options?.signal?.aborted) {
          reject(new AbortError('Request was aborted externally'))
        } else {
          reject(new TimeoutError(`Notification send timeout after ${this.config.timeout}ms`))
        }
      }, this.config.timeout)
    })

    // 執行實際的 send 操作（傳遞 signal 給內部 channel）
    const sendPromise = this.inner.send(notification, notifiable, { signal }).catch((error) => {
      // 如果是外部 signal 導致的 abort，包裝成 AbortError
      if (options?.signal?.aborted) {
        throw new AbortError('Request was aborted externally')
      }
      // 如果是 timeout 導致的 abort，包裝成 TimeoutError
      if (signal.aborted) {
        throw new TimeoutError(`Notification send timeout after ${this.config.timeout}ms`)
      }
      // 其他錯誤直接拋出
      throw error
    })

    // 使用 Promise.race 來競爭：timeout 時立即拋出錯誤
    // 即使底層服務不支援 AbortSignal，timeout 也會生效
    return Promise.race([sendPromise, timeoutPromise])
  }
}
