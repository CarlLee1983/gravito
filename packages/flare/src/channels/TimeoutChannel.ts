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
    // If timeout <= 0, throw error immediately
    if (this.config.timeout <= 0) {
      if (this.config.onTimeout) {
        this.config.onTimeout(this.inner.constructor.name, notification)
      }
      throw new TimeoutError(`Notification send timeout after ${this.config.timeout}ms`)
    }

    // Create AbortController
    const controller = new AbortController()
    const { signal } = controller

    // If external signal is provided, listen to it
    if (options?.signal) {
      if (options.signal.aborted) {
        throw new AbortError('Request was aborted before sending')
      }
      options.signal.addEventListener('abort', () => {
        controller.abort()
      })
    }

    // Create timeout Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        if (this.config.onTimeout) {
          this.config.onTimeout(this.inner.constructor.name, notification)
        }
        controller.abort()

        // Determine if it's a timeout or external abort
        if (options?.signal?.aborted) {
          reject(new AbortError('Request was aborted externally'))
        } else {
          reject(new TimeoutError(`Notification send timeout after ${this.config.timeout}ms`))
        }
      }, this.config.timeout)
    })

    // Execute actual send operation (pass signal to inner channel)
    const sendPromise = this.inner.send(notification, notifiable, { signal }).catch((error) => {
      // If aborted by external signal, wrap as AbortError
      if (options?.signal?.aborted) {
        throw new AbortError('Request was aborted externally')
      }
      // If aborted by timeout, wrap as TimeoutError
      if (signal.aborted) {
        throw new TimeoutError(`Notification send timeout after ${this.config.timeout}ms`)
      }
      // Re-throw other errors
      throw error
    })

    // Use Promise.race: throw error immediately on timeout
    // Timeout works even if underlying service doesn't support AbortSignal
    return Promise.race([sendPromise, timeoutPromise])
  }
}
