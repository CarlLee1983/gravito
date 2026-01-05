import type { Redis } from 'ioredis'
import type { QueueBridge, ZenithLogPayload } from './types'

/**
 * Base class for all Zenith bridges.
 * Handles Redis connection and log publishing.
 */
export abstract class BaseZenithBridge implements QueueBridge {
  protected listeners: Array<{ target: any; event: string; handler: Function }> = []

  constructor(
    protected redis: Redis,
    protected prefix = 'flux_console:',
    protected workerId?: string
  ) {}

  /**
   * Publish a log message to Zenith.
   */
  protected async publishLog(payload: ZenithLogPayload): Promise<void> {
    try {
      const fullPayload = {
        ...payload,
        workerId: payload.workerId || this.workerId,
        timestamp: payload.timestamp || new Date().toISOString(),
      }

      // Publish to Redis channel
      await this.redis.publish(`${this.prefix}logs`, JSON.stringify(fullPayload))

      // Also store in history list (capped at 100)
      const historyKey = `${this.prefix}logs:history`
      if (typeof (this.redis as any).pipeline === 'function') {
        const pipe = (this.redis as any).pipeline()
        pipe.lpush(historyKey, JSON.stringify(fullPayload))
        pipe.ltrim(historyKey, 0, 99)
        await pipe.exec()
      } else {
        await this.redis.lpush(historyKey, JSON.stringify(fullPayload))
      }
    } catch (err) {
      // Silently fail to avoid breaking the application
      console.error('[BaseZenithBridge] Failed to publish log:', err)
    }
  }

  /**
   * Register an event listener for cleanup.
   */
  protected registerListener(target: any, event: string, handler: Function): void {
    this.listeners.push({ target, event, handler })
  }

  abstract attach(target: any): void

  /**
   * Detach all event listeners.
   */
  detach(): void {
    for (const { target, event, handler } of this.listeners) {
      if (typeof target.off === 'function') {
        target.off(event, handler as any)
      } else if (typeof target.removeListener === 'function') {
        target.removeListener(event, handler as any)
      }
    }
    this.listeners = []
  }
}
