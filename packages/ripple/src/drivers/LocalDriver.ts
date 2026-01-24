/**
 * @fileoverview Local (in-memory) driver for @gravito/ripple
 *
 * @module @gravito/ripple/drivers
 */

import type { DriverStatus, RippleDriver } from '../types'

/**
 * Local (in-memory) driver for Ripple.
 *
 * This driver is intended for development and single-server deployments.
 * It distributes messages directly within the current process memory.
 *
 * @example
 * ```typescript
 * import { RippleServer, LocalDriver } from '@gravito/ripple'
 *
 * const server = new RippleServer({
 *   driver: 'local' // Uses LocalDriver internally
 * })
 * ```
 */
export class LocalDriver implements RippleDriver {
  /** Driver name identifier */
  readonly name = 'local'

  /** In-memory map of channel subscribers: channel -> set of callbacks */
  private listeners = new Map<string, Set<(event: string, data: unknown) => void>>()
  private _initialized = false

  /**
   * Publish a message to a channel within the current process.
   *
   * @param channel - Target channel name
   * @param event - Event name
   * @param data - Event payload
   */
  async publish(channel: string, event: string, data: unknown): Promise<void> {
    const callbacks = this.listeners.get(channel)
    if (callbacks) {
      for (const callback of callbacks) {
        callback(event, data)
      }
    }
  }

  /**
   * Subscribe to a channel in memory.
   *
   * @param channel - Channel name
   * @param callback - Function called when a message is published to this channel
   */
  async subscribe(
    channel: string,
    callback: (event: string, data: unknown) => void
  ): Promise<void> {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set())
    }
    this.listeners.get(channel)?.add(callback)
  }

  /**
   * Unsubscribe from a channel in memory.
   *
   * @param channel - Channel name
   */
  async unsubscribe(channel: string): Promise<void> {
    this.listeners.delete(channel)
  }

  /**
   * Initialize the local driver.
   */
  async init(): Promise<void> {
    this._initialized = true
  }

  /**
   * Shutdown the local driver and clear all listeners.
   */
  async shutdown(): Promise<void> {
    this.listeners.clear()
    this._initialized = false
  }

  /**
   * Get the current status of the local driver.
   */
  getStatus(): DriverStatus {
    return {
      name: this.name,
      initialized: this._initialized,
      connected: this._initialized,
    }
  }
}
