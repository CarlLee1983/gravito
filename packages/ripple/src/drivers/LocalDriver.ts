/**
 * @fileoverview Local (in-memory) driver for @gravito/ripple
 *
 * @module @gravito/ripple/drivers
 */

import type { DriverStatus, RippleDriver } from '../types'

export class LocalDriver implements RippleDriver {
  readonly name = 'local'

  private listeners = new Map<string, Set<(event: string, data: unknown) => void>>()
  private _initialized = false

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
    this.listeners.get(channel)?.add(callback)
  }

  async unsubscribe(channel: string): Promise<void> {
    this.listeners.delete(channel)
  }

  async init(): Promise<void> {
    this._initialized = true
  }

  async shutdown(): Promise<void> {
    this.listeners.clear()
    this._initialized = false
  }

  getStatus(): DriverStatus {
    return {
      name: this.name,
      initialized: this._initialized,
      connected: this._initialized,
    }
  }
}
