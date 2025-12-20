import type { EventSource } from './types'

/**
 * Event handler type.
 */
export type EventHandler<T = any> = (payload: T, source?: EventSource) => Promise<void> | void

/**
 * Event subscription info.
 */
interface EventSubscription {
  handler: EventHandler
  once?: boolean
}

/**
 * Event Bus - explicit event tracing and management.
 *
 * Provides explicit event emit source tracking so developers can see where events originate.
 */
export class EventBus {
  private handlers: Map<string, EventSubscription[]> = new Map()
  private eventHistory: Array<{
    event: string
    payload: unknown
    source?: EventSource | undefined
    timestamp: number
  }> = []
  private maxHistorySize = 1000

  /**
   * Emit an event (with source tracking).
   */
  emit<T = any>(event: string, payload: T, source?: EventSource): void {
    const subscriptions = this.handlers.get(event) || []
    const timestamp = Date.now()

    // Record event history.
    this.eventHistory.push({ event, payload, source, timestamp })
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }

    // Execute subscribed handlers.
    for (const subscription of subscriptions) {
      try {
        const result = subscription.handler(payload, source)
        if (result instanceof Promise) {
          // Fire-and-forget async handler.
          result.catch((error) => {
            console.error(`[EventBus] Error in handler for event '${event}':`, error)
          })
        }
      } catch (error) {
        console.error(`[EventBus] Error in handler for event '${event}':`, error)
      }

      // If it's a one-time subscription, remove it.
      if (subscription.once) {
        this.off(event, subscription.handler)
      }
    }
  }

  /**
   * Subscribe to an event.
   */
  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)?.push({ handler })
  }

  /**
   * Subscribe to an event (runs once).
   */
  once<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)?.push({ handler, once: true })
  }

  /**
   * Unsubscribe.
   */
  off<T = any>(event: string, handler: EventHandler<T>): void {
    const subscriptions = this.handlers.get(event)
    if (!subscriptions) {
      return
    }

    const filtered = subscriptions.filter((sub) => sub.handler !== handler)
    if (filtered.length === 0) {
      this.handlers.delete(event)
    } else {
      this.handlers.set(event, filtered)
    }
  }

  /**
   * Remove all listeners.
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event)
    } else {
      this.handlers.clear()
    }
  }

  /**
   * Get event history.
   */
  getHistory(event?: string): Array<{
    event: string
    payload: unknown
    source?: EventSource | undefined
    timestamp: number
  }> {
    if (event) {
      return this.eventHistory.filter((e) => e.event === event)
    }
    return [...this.eventHistory]
  }

  /**
   * Clear event history.
   */
  clearHistory(): void {
    this.eventHistory = []
  }

  /**
   * Get event source info (from stack trace).
   */
  static getEventSource(): EventSource {
    const stack = new Error().stack
    if (!stack) {
      return {}
    }

    const lines = stack.split('\n')
    // Skip first two lines (Error and getEventSource).
    if (lines.length > 2) {
      const callerLine = lines[2]
      if (callerLine) {
        // Try to parse file and line number.
        const match = callerLine.match(/at\s+(.+?):(\d+):(\d+)/)
        if (match) {
          return {
            file: match[1],
            line: match[2] ? parseInt(match[2], 10) : undefined,
            stack: callerLine,
          }
        }
      }
    }

    return { stack }
  }
}
