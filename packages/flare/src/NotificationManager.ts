import type { PlanetCore } from '@gravito/core'
import type { Notification } from './Notification'
import type {
  BatchResult,
  Notifiable,
  NotificationChannel,
  NotificationResult,
  SendOptions,
  SendResult,
} from './types'
import { deepSerialize } from './utils/serialization'

/**
 * Notification manager.
 *
 * Responsible for managing notification channels and delivering notifications.
 */
export class NotificationManager {
  /**
   * Channel registry.
   */
  private channels = new Map<string, NotificationChannel>()

  /**
   * Queue manager (optional, injected by `orbit-queue`).
   */
  private queueManager?:
    | {
        push(
          job: unknown,
          queue?: string | undefined,
          connection?: string | undefined,
          delay?: number | undefined
        ): Promise<void>
      }
    | undefined

  constructor(private core: PlanetCore) {}

  /**
   * Register a notification channel.
   *
   * @param name - The name of the channel.
   * @param channel - The channel instance.
   */
  channel(name: string, channel: NotificationChannel): void {
    this.channels.set(name, channel)
  }

  /**
   * Register the queue manager (called by `orbit-queue`).
   *
   * @param manager - The queue manager implementation.
   */
  setQueueManager(manager: NotificationManager['queueManager']): void {
    this.queueManager = manager
  }

  /**
   * Send a notification.
   *
   * @param notifiable - The recipient of the notification.
   * @param notification - The notification instance.
   * @param options - Options for sending.
   * @returns A promise that resolves to the notification result.
   *
   * @example
   * ```typescript
   * const result = await notificationManager.send(user, new InvoicePaid(invoice))
   * if (!result.allSuccess) { ... }
   * ```
   */
  async send(
    notifiable: Notifiable,
    notification: Notification,
    options: SendOptions = {}
  ): Promise<NotificationResult> {
    const channels = notification.via(notifiable)
    const startTime = Date.now()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.core.hooks as any).emit('notification:sending', {
      notification,
      notifiable,
      channels,
    })

    // Check whether it should be queued.
    if (notification.shouldQueue() && this.queueManager) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.core.hooks as any).emit('notification:queued', {
        notification,
        notifiable,
        channels,
      })
      const queueConfig = notification.getQueueConfig()

      // Create a queue job.
      const queueJob = {
        type: 'notification',
        notification: notification.constructor.name,
        notifiableId: notifiable.getNotifiableId(),
        notifiableType: notifiable.getNotifiableType?.() || 'user',
        channels,
        notificationData: this.serializeNotification(notification),
        handle: async () => {
          await this.sendNow(notifiable, notification, channels)
        },
      }

      await this.queueManager.push(
        queueJob,
        queueConfig.queue,
        queueConfig.connection,
        queueConfig.delay
      )

      return {
        notification: notification.constructor.name,
        notifiable: notifiable.getNotifiableId(),
        results: [{ success: true, channel: 'queue' }],
        allSuccess: true,
        timestamp: new Date(),
      }
    }

    // Send immediately.
    const results = await this.sendNow(notifiable, notification, channels, options)
    const totalDuration = Date.now() - startTime

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.core.hooks as any).emit('notification:sent', {
      notification,
      notifiable,
      results,
      allSuccess: results.every((r) => r.success),
      totalDuration,
    })

    if (options.throwOnError) {
      const errors = results.filter((r) => !r.success && r.error).map((r) => r.error!)

      if (errors.length > 0) {
        throw new AggregateError(errors, `Notification failed on ${errors.length} channel(s)`)
      }
    }

    return {
      notification: notification.constructor.name,
      notifiable: notifiable.getNotifiableId(),
      results,
      allSuccess: results.every((r) => r.success),
      timestamp: new Date(),
    }
  }

  /**
   * Batch send notification to multiple recipients.
   *
   * @param notifiables - List of recipients.
   * @param notification - The notification instance.
   * @param options - Options for sending.
   * @returns A promise that resolves to the batch result.
   */
  async sendBatch(
    notifiables: Notifiable[],
    notification: Notification,
    options: SendOptions & {
      /** Batch concurrency (default: 10) */
      batchConcurrency?: number
    } = {}
  ): Promise<BatchResult> {
    const { batchConcurrency = 10 } = options
    const startTime = Date.now()
    const results: NotificationResult[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.core.hooks as any).emit('notification:batch:start', {
      notification,
      count: notifiables.length,
    })

    // Process in batches
    for (let i = 0; i < notifiables.length; i += batchConcurrency) {
      const batch = notifiables.slice(i, i + batchConcurrency)
      const batchPromises = batch.map((notifiable) => this.send(notifiable, notification, options))
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    const duration = Date.now() - startTime
    const successCount = results.filter((r) => r.allSuccess).length

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.core.hooks as any).emit('notification:batch:complete', {
      notification,
      total: notifiables.length,
      success: successCount,
      failed: notifiables.length - successCount,
      duration,
    })

    return {
      total: notifiables.length,
      success: successCount,
      failed: notifiables.length - successCount,
      results,
      duration,
    }
  }

  /**
   * Batch send notification to multiple recipients (streaming).
   *
   * @param notifiables - AsyncIterable or Iterable of recipients.
   * @param notification - The notification instance.
   * @param options - Options for sending.
   * @yields Notification results as they are processed.
   */
  async *sendBatchStream(
    notifiables: AsyncIterable<Notifiable> | Iterable<Notifiable>,
    notification: Notification,
    options: SendOptions & { batchSize?: number } = {}
  ): AsyncGenerator<NotificationResult> {
    const { batchSize = 10 } = options
    let batch: Notifiable[] = []

    for await (const notifiable of notifiables) {
      batch.push(notifiable)

      if (batch.length >= batchSize) {
        const promises = batch.map((n) => this.send(n, notification, options))
        const results = await Promise.all(promises)
        for (const result of results) {
          yield result
        }
        batch = []
      }
    }

    // Process remaining
    if (batch.length > 0) {
      const promises = batch.map((n) => this.send(n, notification, options))
      const results = await Promise.all(promises)
      for (const result of results) {
        yield result
      }
    }
  }

  /**
   * Send immediately (without queue).
   */
  private async sendNow(
    notifiable: Notifiable,
    notification: Notification,
    channels: string[],
    options: SendOptions = {}
  ): Promise<SendResult[]> {
    const { parallel = true, concurrency } = options

    if (!parallel) {
      return this.sendSequential(notifiable, notification, channels)
    }

    if (concurrency && concurrency > 0) {
      return this.sendWithConcurrencyLimit(notifiable, notification, channels, concurrency)
    }

    return this.sendParallel(notifiable, notification, channels)
  }

  private async sendSequential(
    notifiable: Notifiable,
    notification: Notification,
    channels: string[]
  ): Promise<SendResult[]> {
    const results: SendResult[] = []

    for (const channelName of channels) {
      results.push(await this.sendToChannel(notifiable, notification, channelName))
    }
    return results
  }

  private async sendParallel(
    notifiable: Notifiable,
    notification: Notification,
    channels: string[]
  ): Promise<SendResult[]> {
    const promises = channels.map((channelName) =>
      this.sendToChannel(notifiable, notification, channelName)
    )

    return Promise.all(promises)
  }

  private async sendWithConcurrencyLimit(
    notifiable: Notifiable,
    notification: Notification,
    channels: string[],
    concurrency: number
  ): Promise<SendResult[]> {
    return this.processWithConcurrency(
      channels,
      (channel) => this.sendToChannel(notifiable, notification, channel),
      concurrency
    )
  }

  private async processWithConcurrency<T>(
    items: string[],
    handler: (item: string) => Promise<T>,
    concurrency: number
  ): Promise<T[]> {
    const finalResults: T[] = []
    const pool = new Set<Promise<void>>()

    for (const item of items) {
      const p = handler(item).then((res) => {
        finalResults.push(res)
      })
      pool.add(p)
      p.finally(() => pool.delete(p))

      if (pool.size >= concurrency) {
        await Promise.race(pool)
      }
    }
    await Promise.all(pool)
    return finalResults
  }

  private async sendToChannel(
    notifiable: Notifiable,
    notification: Notification,
    channelName: string
  ): Promise<SendResult> {
    const channel = this.channels.get(channelName)
    const startTime = Date.now()

    if (!channel) {
      this.core.logger.warn(`[NotificationManager] Channel '${channelName}' not found, skipping`)
      return {
        success: false,
        channel: channelName,
        error: new Error(`Channel '${channelName}' not registered`),
      }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.core.hooks as any).emit('notification:channel:sending', {
        notification,
        notifiable,
        channel: channelName,
      })

      await channel.send(notification, notifiable)
      const duration = Date.now() - startTime

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.core.hooks as any).emit('notification:channel:sent', {
        notification,
        notifiable,
        channel: channelName,
        duration,
      })

      return {
        success: true,
        channel: channelName,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const err = error instanceof Error ? error : new Error(String(error))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.core.hooks as any).emit('notification:channel:failed', {
        notification,
        notifiable,
        channel: channelName,
        error: err,
        duration,
      })

      this.core.logger.error(
        `[NotificationManager] Failed to send notification via '${channelName}':`,
        error
      )
      return {
        success: false,
        channel: channelName,
        error: err,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Serialize notification (for queuing).
   *
   * @param notification - The notification to serialize.
   * @returns A plain object representation of the notification.
   */
  private serializeNotification(notification: Notification): Record<string, unknown> {
    return deepSerialize(notification) as Record<string, unknown>
  }
}
