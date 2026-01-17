import { EventEmitter } from 'node:events'
import type { Redis } from 'ioredis'
import type { SystemLog } from './QueueService'

export class LogStreamProcessor {
  private static readonly MAX_LOGS_PER_SEC = 50
  private logEmitter = new EventEmitter()
  private logThrottleCount = 0
  private logThrottleReset = Date.now()

  constructor(
    private redis: Redis,
    private subRedis: Redis
  ) {
    this.setupLogSubscription()
  }

  /**
   * Setup Redis log subscription
   */
  private setupLogSubscription(): void {
    this.logEmitter.setMaxListeners(1000)

    this.subRedis.on('message', (channel, message) => {
      if (channel === 'flux_console:logs') {
        this.processLogMessage(message)
      }
    })
  }

  /**
   * Process incoming log message with throttling
   */
  private processLogMessage(message: string): void {
    try {
      const now = Date.now()

      if (now - this.logThrottleReset > 1000) {
        this.logThrottleReset = now
        this.logThrottleCount = 0
      }

      if (this.logThrottleCount < LogStreamProcessor.MAX_LOGS_PER_SEC) {
        this.logThrottleCount++
        const log = JSON.parse(message) as SystemLog
        this.logEmitter.emit('log', log)

        if (log.level === 'success' || log.level === 'error') {
          this.updateThroughput()
        }
      }
    } catch (_e) {
      // Ignore parse errors
    }
  }

  /**
   * Update throughput counter for job completions
   */
  private updateThroughput(): void {
    const minute = Math.floor(Date.now() / 60000)
    this.redis
      .incr(`flux_console:throughput:${minute}`)
      .then(() => {
        this.redis.expire(`flux_console:throughput:${minute}`, 3600)
      })
      .catch(() => {})
  }

  /**
   * Subscribe to log stream
   */
  async subscribe(): Promise<void> {
    await this.subRedis.subscribe('flux_console:logs')
  }

  /**
   * Add listener for log events
   */
  onLog(callback: (msg: SystemLog) => void): () => void {
    this.logEmitter.on('log', callback)
    return () => {
      this.logEmitter.off('log', callback)
    }
  }

  /**
   * Get emitter for direct access
   */
  getEmitter(): EventEmitter {
    return this.logEmitter
  }
}
