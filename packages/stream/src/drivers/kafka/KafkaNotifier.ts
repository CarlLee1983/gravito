import { EventEmitter } from 'node:events'

/**
 * EventEmitter-based notification bridge for ReactiveStrategy integration.
 *
 * Manages notification callbacks and emits events when jobs arrive in queues.
 *
 * @public
 */
export class KafkaNotifier extends EventEmitter {
  private callbacks = new Map<string, Array<(queue: string) => Promise<void>>>()
  private enabled = false

  /**
   * Enable notifications.
   */
  enable(): void {
    this.enabled = true
  }

  /**
   * Disable notifications.
   */
  disable(): void {
    this.enabled = false
  }

  /**
   * Check if notifications are enabled.
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Register a callback for one or more queues.
   */
  registerCallback(
    queues: string[],
    callback: (queue: string) => Promise<void>
  ): void {
    for (const queue of queues) {
      if (!this.callbacks.has(queue)) {
        this.callbacks.set(queue, [])
      }
      this.callbacks.get(queue)!.push(callback)
    }
  }

  /**
   * Notify subscribers of a queue (non-blocking).
   */
  notify(queue: string): void {
    if (!this.enabled) return

    // Emit event
    this.emit('notify', queue)

    // Call registered callbacks (non-blocking)
    const cbs = this.callbacks.get(queue)
    if (cbs) {
      for (const cb of cbs) {
        cb(queue).catch((err) => {
          console.error(`[KafkaNotifier] Callback error for ${queue}: ${err}`)
        })
      }
    }
  }

  /**
   * Clear all callbacks and event listeners.
   */
  clearCallbacks(): void {
    this.callbacks.clear()
    this.removeAllListeners()
  }
}
