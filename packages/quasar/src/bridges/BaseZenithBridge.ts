import type { Redis } from 'ioredis'
import { LogBuffer } from './LogBuffer'
import type { QueueBridge, ZenithLogPayload } from './types'

/**
 * Base class for all Zenith bridges.
 * Handles Redis connection and log publishing.
 */
export abstract class BaseZenithBridge implements QueueBridge {
  protected listeners: Array<{ target: any; event: string; handler: Function }> = []
  protected logBuffer: LogBuffer

  constructor(
    protected redis: Redis,
    protected prefix = 'flux_console:',
    protected workerId?: string,
    options: { batchSize?: number; flushInterval?: number } = {}
  ) {
    this.logBuffer = new LogBuffer(redis, prefix, {
      batchSize: options.batchSize ?? 100,
      flushInterval: options.flushInterval ?? 1000,
    })
  }

  /**
   * Publish a log message to Zenith.
   */
  protected async publishLog(payload: ZenithLogPayload): Promise<void> {
    const fullPayload = {
      ...payload,
      workerId: payload.workerId || this.workerId,
      timestamp: payload.timestamp || new Date().toISOString(),
    }

    this.logBuffer.add(fullPayload)
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
    this.logBuffer.stop()
  }
}
