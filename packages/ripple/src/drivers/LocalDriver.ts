/**
 * @fileoverview Local (in-memory) driver for @gravito/ripple
 *
 * Suitable for single-instance deployments. For horizontal scaling,
 * use the Redis driver.
 *
 * @module @gravito/ripple/drivers
 */

import type { RippleDriver } from '../types'

/**
 * In-memory driver for single-instance deployments
 *
 * This driver keeps all state in memory and is suitable for:
 * - Development
 * - Single-server deployments
 * - Serverless functions (with caveats)
 *
 * For multi-server deployments, use RedisDriver instead.
 */
export class LocalDriver implements RippleDriver {
  readonly name = 'local'

  /** Event callbacks per channel */
  private listeners = new Map<string, Set<(event: string, data: unknown) => void>>()

  async publish(channel: string, event: string, data: unknown): Promise<void> {
    const callbacks = this.listeners.get(channel)
    if (callbacks) {
      for (const callback of callbacks) {
        callback(event, data)
      }
    }
  }

  async subscribe(
    channel: string,
    callback: (event: string, data: unknown) => void
  ): Promise<void> {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set())
    }
    this.listeners.get(channel)!.add(callback)
  }

  async unsubscribe(channel: string): Promise<void> {
    this.listeners.delete(channel)
  }

  async init(): Promise<void> {
    // No-op for local driver
  }

  async shutdown(): Promise<void> {
    this.listeners.clear()
  }
}
