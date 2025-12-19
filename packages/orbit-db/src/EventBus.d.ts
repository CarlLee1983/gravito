import type { EventSource } from './types'
/**
 * Event handler type.
 */
export type EventHandler<T = any> = (payload: T, source?: EventSource) => Promise<void> | void
/**
 * Event Bus - explicit event tracing and management.
 *
 * Provides explicit event emit source tracking so developers can see where events originate.
 */
export declare class EventBus {
  private handlers
  private eventHistory
  private maxHistorySize
  /**
   * Emit an event (with source tracking).
   */
  emit<T = any>(event: string, payload: T, source?: EventSource): void
  /**
   * Subscribe to an event.
   */
  on<T = any>(event: string, handler: EventHandler<T>): void
  /**
   * Subscribe to an event (runs once).
   */
  once<T = any>(event: string, handler: EventHandler<T>): void
  /**
   * Unsubscribe.
   */
  off<T = any>(event: string, handler: EventHandler<T>): void
  /**
   * Remove all listeners.
   */
  removeAllListeners(event?: string): void
  /**
   * Get event history.
   */
  getHistory(event?: string): Array<{
    event: string
    payload: unknown
    source?: EventSource
    timestamp: number
  }>
  /**
   * Clear event history.
   */
  clearHistory(): void
  /**
   * Get event source info (from stack trace).
   */
  static getEventSource(): EventSource
}
//# sourceMappingURL=EventBus.d.ts.map
