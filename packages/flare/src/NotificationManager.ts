import type { PlanetCore } from '@gravito/core'
import {
  type MetricsSummary,
  type NotificationMetric,
  NotificationMetricsCollector,
} from './metrics/NotificationMetrics'
import type { Notification } from './Notification'
import type {
  BatchResult,
  Notifiable,
  NotificationChannel,
  NotificationResult,
  RetryConfig,
  SendOptions,
  SendResult,
  ShouldRetry,
} from './types'
import type { ChannelMiddleware } from './types/middleware'
import { createHookEmitter, type HookEmitter } from './utils/hookEmitter'
import { isRetryableError, withRetry } from './utils/retry'
import { deepSerialize } from './utils/serialization'
import { checkSerializable } from './utils/serializationGuard'

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
   * Middleware stack for intercepting channel sends.
   */
  private middlewares: ChannelMiddleware[] = []

  /**
   * Indicates whether the middleware stack needs re-sorting.
   */
  private middlewaresDirty = false

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

  /**
   * Type-safe hook emitter for notification events.
   */
  private hookEmitter: HookEmitter

  constructor(private core: PlanetCore) {
    this.hookEmitter = createHookEmitter(core)
  }

  private metrics?: NotificationMetricsCollector

  /**
   * Enable metrics collection.
   */
  enableMetrics(maxHistory = 10000): void {
    this.metrics = new NotificationMetricsCollector(maxHistory)
  }

  /**
   * Get metrics summary.
   */
  getMetrics(since?: Date): MetricsSummary | undefined {
    return this.metrics?.getSummary(since)
  }

  /**
   * Get recent failures.
   */
  getRecentFailures(limit = 10): NotificationMetric[] {
    return this.metrics?.getRecentFailures(limit) ?? []
  }

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
   * Register a middleware for intercepting channel sends.
   *
   * Middleware will be executed in the order they are registered.
   * Each middleware can modify, block, or monitor the notification flow.
   *
   * @param middleware - The middleware instance to register.
   *
   * @example
   * ```typescript
   * import { RateLimitMiddleware } from '@gravito/flare'
   *
   * const rateLimiter = new RateLimitMiddleware({
   *   email: { maxPerSecond: 10 },
   *   sms: { maxPerSecond: 5 }
   * })
   *
   * manager.use(rateLimiter)
   * ```
   */
  use(middleware: ChannelMiddleware): void {
    this.middlewares.push(middleware)
    this.middlewaresDirty = true
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

    await this.hookEmitter.emit('notification:sending', {
      notification,
      notifiable,
      channels,
    })

    // Check whether it should be queued.
    if (notification.shouldQueue() && this.queueManager) {
      await this.hookEmitter.emit('notification:queued', {
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
        notificationData: (() => {
          // Check serialization safety, log warning if unsafe
          const checkResult = checkSerializable(notification)
          if (!checkResult.serializable) {
            this.core.logger.warn(
              `[NotificationManager] Notification '${notification.constructor.name}' contains non-serializable properties. ` +
                `These will be filtered out during queuing. Problematic paths: ${checkResult.problematicPaths.join(', ')}. ` +
                `Advice: Use LazyNotification or keep only IDs/pure data in the constructor.`
            )
          }
          return this.serializeNotification(notification)
        })(),
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

    await this.hookEmitter.emit('notification:sent', {
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

    await this.hookEmitter.emit('notification:batch:start', {
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

    await this.hookEmitter.emit('notification:batch:complete', {
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
      return this.sendSequential(notifiable, notification, channels, options)
    }

    if (concurrency && concurrency > 0) {
      return this.sendWithConcurrencyLimit(notifiable, notification, channels, concurrency, options)
    }

    return this.sendParallel(notifiable, notification, channels, options)
  }

  private async sendSequential(
    notifiable: Notifiable,
    notification: Notification,
    channels: string[],
    options?: SendOptions
  ): Promise<SendResult[]> {
    const results: SendResult[] = []

    for (const channelName of channels) {
      results.push(await this.sendToChannel(notifiable, notification, channelName, options?.retry))
    }
    return results
  }

  private async sendParallel(
    notifiable: Notifiable,
    notification: Notification,
    channels: string[],
    options?: SendOptions
  ): Promise<SendResult[]> {
    const promises = channels.map((channelName) =>
      this.sendToChannel(notifiable, notification, channelName, options?.retry)
    )

    return Promise.all(promises)
  }

  private async sendWithConcurrencyLimit(
    notifiable: Notifiable,
    notification: Notification,
    channels: string[],
    concurrency: number,
    options?: SendOptions
  ): Promise<SendResult[]> {
    return this.processWithConcurrency(
      channels,
      (channel) => this.sendToChannel(notifiable, notification, channel, options?.retry),
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
    channelName: string,
    retryConfig?: Partial<RetryConfig> | boolean
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

    const retry = this.getRetryConfig(notification, retryConfig)

    try {
      if (retry) {
        await withRetry(
          () => this.executeChannelSend(channel, notification, notifiable, channelName),
          {
            ...retry,
            shouldRetry: retry.retryableErrors || isRetryableError,
            onRetry: (error, attempt, delay) => {
              this.core.logger.warn(
                `[NotificationManager] Channel '${channelName}' failed, ` +
                  `retrying (${attempt}/${retry.maxAttempts}) in ${delay}ms`,
                error
              )
              this.hookEmitter.emit('notification:channel:retry', {
                notification,
                notifiable,
                channel: channelName,
                error,
                attempt,
                nextDelay: delay,
              })
            },
          }
        )
      } else {
        await this.executeChannelSend(channel, notification, notifiable, channelName)
      }

      const duration = Date.now() - startTime

      if (this.metrics) {
        this.metrics.record({
          notification: notification.constructor.name,
          channel: channelName,
          success: true,
          duration,
          timestamp: new Date(),
        })
      }

      return {
        success: true,
        channel: channelName,
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const err = error instanceof Error ? error : new Error(String(error))

      await this.hookEmitter.emit('notification:channel:failed', {
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

      if (this.metrics) {
        this.metrics.record({
          notification: notification.constructor.name,
          channel: channelName,
          success: false,
          duration,
          timestamp: new Date(),
          error: err.message,
        })
      }

      return {
        success: false,
        channel: channelName,
        error: err,
        duration: Date.now() - startTime,
      }
    }
  }

  private async executeChannelSend(
    channel: NotificationChannel,
    notification: Notification,
    notifiable: Notifiable,
    channelName: string
  ): Promise<void> {
    await this.hookEmitter.emit('notification:channel:sending', {
      notification,
      notifiable,
      channel: channelName,
    })

    // Execute middleware chain
    const executeWithMiddleware = async () => {
      await this.executeMiddlewareChain(0, notification, notifiable, channelName, async () => {
        await channel.send(notification, notifiable)
      })
    }

    await executeWithMiddleware()
    const duration = 0 // Approximate for inner call, total calculated in wrapper

    await this.hookEmitter.emit('notification:channel:sent', {
      notification,
      notifiable,
      channel: channelName,
      duration,
    })
  }

  /**
   * Retrieves the sorted list of middleware (Lazy sorting).
   *
   * Uses a lazy evaluation strategy: sorting only happens when needed to avoid
   * overhead on every `use()` call.
   * Sorting rules:
   * 1. Higher priority (larger number) executes first.
   * 2. Stable sort is maintained for identical priorities (registration order).
   *
   * @returns The sorted list of middleware.
   * @private
   */
  private getSortedMiddlewares(): ChannelMiddleware[] {
    if (!this.middlewaresDirty) {
      return this.middlewares
    }

    // Sort by priority descending (stable sort maintained for same priority)
    this.middlewares.sort((a, b) => {
      const priorityA = a.priority ?? 0
      const priorityB = b.priority ?? 0
      return priorityB - priorityA // Descending: high priority first
    })

    this.middlewaresDirty = false
    return this.middlewares
  }

  /**
   * Execute middleware chain recursively.
   *
   * @param index - Current middleware index
   * @param notification - The notification being sent
   * @param notifiable - The recipient
   * @param channelName - The channel name
   * @param finalHandler - The final handler to execute (actual channel.send)
   * @private
   */
  private async executeMiddlewareChain(
    index: number,
    notification: Notification,
    notifiable: Notifiable,
    channelName: string,
    finalHandler: () => Promise<void>
  ): Promise<void> {
    const sortedMiddlewares = this.getSortedMiddlewares()

    // If we've executed all middleware, run the final handler
    if (index >= sortedMiddlewares.length) {
      await finalHandler()
      return
    }

    // Get current middleware
    const middleware = sortedMiddlewares[index]

    // Execute middleware with next() function
    await middleware.handle(notification, notifiable, channelName, async () => {
      // next() calls the next middleware in the chain
      await this.executeMiddlewareChain(
        index + 1,
        notification,
        notifiable,
        channelName,
        finalHandler
      )
    })
  }

  private getRetryConfig(
    notification: Notification,
    options?: Partial<RetryConfig> | boolean
  ): RetryConfig | undefined {
    // Check if notification implements ShouldRetry
    const notificationRetry = (notification as unknown as ShouldRetry).retry

    if (options === false || notificationRetry === undefined) {
      if (typeof options === 'object') {
        return {
          maxAttempts: 3,
          baseDelay: 1000,
          backoff: 'exponential',
          maxDelay: 30000,
          ...options,
        }
      }
      return undefined
    }

    if (options || notificationRetry) {
      const retryOptions = typeof options === 'object' ? options : {}
      return {
        maxAttempts: 3,
        baseDelay: 1000,
        backoff: 'exponential',
        maxDelay: 30000,
        ...notificationRetry,
        ...retryOptions,
      }
    }

    return undefined
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
