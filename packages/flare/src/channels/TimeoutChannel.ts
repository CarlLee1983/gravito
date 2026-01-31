import type { Notification } from '../Notification'
import type { Notifiable, NotificationChannel } from '../types'

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
 * Timeout Channel 裝飾器。
 *
 * 為任何 NotificationChannel 加上 timeout 功能。
 * 如果發送通知超過指定時間，會拋出 TimeoutError。
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
 * ```
 */
export class TimeoutChannel implements NotificationChannel {
  constructor(
    private inner: NotificationChannel,
    private config: TimeoutConfig
  ) {}

  async send(notification: Notification, notifiable: Notifiable): Promise<void> {
    // 如果 timeout <= 0，立即拋出錯誤
    if (this.config.timeout <= 0) {
      // 呼叫 onTimeout 回調（如果有提供）
      if (this.config.onTimeout) {
        this.config.onTimeout(this.inner.constructor.name, notification)
      }

      throw new TimeoutError(
        `Notification send timeout after ${this.config.timeout}ms`
      )
    }

    // 建立 timeout Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        // 呼叫 onTimeout 回調（如果有提供）
        if (this.config.onTimeout) {
          this.config.onTimeout(this.inner.constructor.name, notification)
        }

        reject(
          new TimeoutError(
            `Notification send timeout after ${this.config.timeout}ms`
          )
        )
      }, this.config.timeout)
    })

    // 執行實際的 send 操作
    const sendPromise = this.inner.send(notification, notifiable)

    // 使用 Promise.race 來競爭
    return Promise.race([sendPromise, timeoutPromise])
  }
}
