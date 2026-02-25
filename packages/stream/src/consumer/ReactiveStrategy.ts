import type { Job } from '../Job'
import type { QueueManager } from '../QueueManager'
import type { ConsumerStrategy } from './ConsumerStrategy'

/**
 * ReactiveStrategy implements push-based job consumption.
 *
 * Listens for queue notifications and pulls jobs reactively when they arrive.
 * Implements drain-loop pattern with optional polling fallback.
 *
 * Characteristics:
 * - Low latency (immediate job pickup)
 * - Efficient resource usage (no continuous polling)
 * - Requires driver support for onNotify()
 * - Includes polling fallback to prevent starvation
 *
 * @public
 */
export class ReactiveStrategy implements ConsumerStrategy {
  private running = false
  private stopRequested = false
  private lastNotificationTime = Date.now()
  private fallbackPollingTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private queueManager: QueueManager,
    private queues: string[],
    private connectionName: string,
    private options: {
      concurrency: number
      batchSize: number
      stats: { active: number }
      reactivePollingFallback: number
      debug: boolean
      log: (message: string, data?: unknown) => void
    }
  ) {}

  async start(): Promise<void> {
    if (this.running) {
      throw new Error('ReactiveStrategy is already running')
    }

    this.running = true
    this.stopRequested = false
    this.lastNotificationTime = Date.now()

    this.options.log('[ReactiveStrategy] Starting')

    const driver = this.queueManager.getDriver(this.connectionName)

    // Enable notifications
    try {
      if (driver.enableNotifications) {
        await driver.enableNotifications()
      }

      // Register notification listener
      if (driver.onNotify) {
        await driver.onNotify(this.queues, async () => {
          this.notificationArrived = true
          this.lastNotificationTime = Date.now()
        })
      }
    } catch (error) {
      this.options.log('[ReactiveStrategy] Failed to enable notifications:', error)
      this.running = false
      throw error
    }

    this.options.log('[ReactiveStrategy] Started')

    // Start fallback polling
    this.startFallbackPolling()
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return
    }

    this.options.log('[ReactiveStrategy] Stopping...')
    this.stopRequested = true

    // Stop fallback polling
    if (this.fallbackPollingTimer) {
      clearTimeout(this.fallbackPollingTimer)
      this.fallbackPollingTimer = null
    }

    // Disable notifications
    const driver = this.queueManager.getDriver(this.connectionName)
    if (driver.disableNotifications) {
      try {
        await driver.disableNotifications()
      } catch (error) {
        this.options.log('[ReactiveStrategy] Error disabling notifications:', error)
      }
    }

    this.running = false
    this.options.log('[ReactiveStrategy] Stopped')
  }

  isRunning(): boolean {
    return this.running
  }

  async fetchJobs(): Promise<Job[]> {
    if (!this.running) {
      return []
    }

    const capacity = this.options.concurrency - this.options.stats.active
    if (capacity <= 0) {
      return []
    }

    const currentBatchSize = Math.min(this.options.batchSize, capacity)
    const jobs: Job[] = []

    try {
      // Drain available jobs from the queues
      for (const queue of this.queues) {
        if (currentBatchSize > 1) {
          const fetched = await this.queueManager.popMany(
            queue,
            currentBatchSize,
            this.connectionName
          )
          if (fetched.length > 0) {
            jobs.push(...fetched)
            if (jobs.length >= currentBatchSize) {
              break
            }
          }
        } else {
          const job = await this.queueManager.pop(queue, this.connectionName)
          if (job) {
            jobs.push(job)
            break
          }
        }
      }
    } catch (error) {
      console.error('[ReactiveStrategy] Error fetching jobs:', error)
    }

    return jobs
  }

  private startFallbackPolling(): void {
    const checkFallback = async () => {
      if (!this.running || this.stopRequested) {
        return
      }

      const timeSinceLastNotification = Date.now() - this.lastNotificationTime

      // Check if we need fallback polling
      if (timeSinceLastNotification > this.options.reactivePollingFallback) {
        this.options.log('[ReactiveStrategy] Fallback polling triggered')

        // Do a fallback poll check
        const jobs = await this.fetchJobs()
        if (jobs.length > 0) {
          // Signal drain loop to drain
          this.notificationArrived = true
        }

        this.lastNotificationTime = Date.now()
      }

      // Check again after interval
      if (this.running && !this.stopRequested) {
        this.fallbackPollingTimer = setTimeout(
          checkFallback,
          Math.min(this.options.reactivePollingFallback / 2, 5000)
        )
      }
    }

    checkFallback()
  }
}
