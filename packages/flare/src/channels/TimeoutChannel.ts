import type { Notification } from '../Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel } from '../types'

/**
 * Configuration options for TimeoutChannel.
 */
export interface TimeoutConfig {
  /**
   * Timeout duration in milliseconds.
   */
  timeout: number

  /**
   * Optional callback function triggered when a timeout occurs.
   *
   * @param channel - The name of the channel that timed out.
   * @param notification - The notification instance that was being sent.
   */
  onTimeout?: (channel: string, notification: Notification) => void
}

/**
 * Exception thrown when a notification send operation exceeds the configured timeout.
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Exception thrown when a request is aborted by an external AbortController signal.
 */
export class AbortError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AbortError'
  }
}

/**
 * Decorator for notification channels that adds timeout and cancellation support.
 *
 * Implements actual request cancellation using AbortController and Promise.race.
 * Compatible with v4.0.0+ cancellation architecture.
 *
 * @example
 * ```typescript
 * const slackChannel = new SlackChannel(config);
 * const timeoutChannel = new TimeoutChannel(slackChannel, {
 *   timeout: 5000,
 *   onTimeout: (channel, notification) => {
 *     console.error(`Channel ${channel} timed out`);
 *   }
 * });
 *
 * // Send with timeout
 * await timeoutChannel.send(notification, user);
 *
 * // Support external manual abort
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 3000);
 * await timeoutChannel.send(notification, user, { signal: controller.signal });
 * ```
 *
 * @remarks
 * In v4.0.0, this class uses AbortController to allow underlying fetch requests
 * to be physically cancelled, while using Promise.race to ensure the timeout
 * error is thrown immediately without waiting for the underlying request to finish.
 */
export class TimeoutChannel implements NotificationChannel {
  constructor(
    private inner: NotificationChannel,
    private config: TimeoutConfig
  ) {}

  /**
   * Sends a notification through the inner channel with a timeout guard.
   *
   * @param notification - The notification to send.
   * @param notifiable - The recipient of the notification.
   * @param options - Send options including an optional AbortSignal.
   * @returns A promise that resolves when the notification is sent.
   * @throws {TimeoutError} Thrown if the operation exceeds the configured timeout.
   * @throws {AbortError} Thrown if the operation is aborted via the provided signal.
   */
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
