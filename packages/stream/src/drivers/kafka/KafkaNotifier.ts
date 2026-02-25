import { EventEmitter } from 'node:events'

/**
 * Typed event data for message arrival notifications.
 * @public
 */
export interface MessageArrivedEvent {
  queue: string
  count: number
  timestamp: number
}

/**
 * Typed event data for callback completion.
 * @public
 */
export interface CallbackCompletedEvent {
  queue: string
  success: boolean
  duration: number
  error?: Error
}

/**
 * EventEmitter-based notification bridge for ReactiveStrategy integration.
 *
 * Manages notification callbacks and emits typed events for message arrival,
 * callback completion, and errors. Integrates with subscribe() for reactive consumption.
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
   * Register typed event listener for message arrival.
   */
  onMessageArrived(listener: (event: MessageArrivedEvent) => void): void {
    this.on('messageArrived', listener)
  }

  /**
   * Register typed event listener for callback completion.
   */
  onCallbackCompleted(listener: (event: CallbackCompletedEvent) => void): void {
    this.on('callbackCompleted', listener)
  }

  /**
   * Notify subscribers of a queue with message count (non-blocking).
   */
  notifyWithCount(queue: string, count: number): void {
    if (!this.enabled) return

    const timestamp = Date.now()

    // Emit typed event
    const event: MessageArrivedEvent = { queue, count, timestamp }
    this.emit('messageArrived', event)

    // Legacy event for backward compatibility
    this.emit('notify', queue)

    // Call registered callbacks (non-blocking)
    const cbs = this.callbacks.get(queue)
    if (cbs) {
      for (const cb of cbs) {
        const startTime = Date.now()
        cb(queue)
          .then(() => {
            const duration = Date.now() - startTime
            const completedEvent: CallbackCompletedEvent = {
              queue,
              success: true,
              duration
            }
            this.emit('callbackCompleted', completedEvent)
          })
          .catch((err) => {
            const duration = Date.now() - startTime
            const completedEvent: CallbackCompletedEvent = {
              queue,
              success: false,
              duration,
              error: err instanceof Error ? err : new Error(String(err))
            }
            this.emit('callbackCompleted', completedEvent)
          })
      }
    }
  }

  /**
   * Notify subscribers of a queue (non-blocking, legacy method).
   * Prefer notifyWithCount() for better metrics and typed events.
   */
  notify(queue: string): void {
    this.notifyWithCount(queue, 1)
  }

  /**
   * Clear all callbacks and event listeners.
   */
  clearCallbacks(): void {
    this.callbacks.clear()
    this.removeAllListeners()
  }
}
