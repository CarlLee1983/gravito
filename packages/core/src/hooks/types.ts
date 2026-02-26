// import type { ConnectionContract } from '@gravito/atlas'
import type { CircuitBreakerOptions } from '../events/CircuitBreaker'
import type { EventBackend } from '../events/EventBackend'
import type { EventQueueConfig } from '../events/EventPriorityQueue'

/**
 * Callback function for filters (transforms values).
 * @public
 */
export type FilterCallback<T = unknown> = (value: T, ...args: unknown[]) => Promise<T> | T

/**
 * Callback function for actions (side effects).
 * @public
 */
export type ActionCallback<TArgs = unknown> = (args: TArgs) => Promise<void> | void

/**
 * Options for listener registration.
 * @public
 */
export interface ListenerOptions {
  /**
   * Explicitly specify the listener type.
   * - 'sync': Force synchronous dispatch for this listener
   * - 'async': Force asynchronous dispatch for this listener
   * - 'auto': Auto-detect based on function signature (default)
   * @default 'auto'
   */
  type?: 'sync' | 'async' | 'auto'

  /**
   * Circuit breaker configuration for this listener.
   */
  circuitBreaker?: CircuitBreakerOptions
}

/**
 * Information about a registered listener.
 * @public
 */
export interface ListenerInfo {
  /**
   * The callback function.
   */
  callback: ActionCallback

  /**
   * Whether the listener is considered async.
   */
  isAsync: boolean

  /**
   * The explicit type override, if any.
   */
  typeOverride?: 'sync' | 'async' | 'auto'
}

/**
 * Configuration for HookManager.
 * @public
 */
export interface HookManagerConfig {
  /**
   * Enable async event dispatch by default.
   * When true, doAction() will automatically use async dispatch if any listener is async.
   * @default false
   */
  asyncByDefault?: boolean

  /**
   * Migration mode for backward compatibility.
   * - 'sync': All events use synchronous dispatch (legacy mode)
   * - 'hybrid': Auto-detect and use async for async listeners (recommended)
   * - 'async': All events use async dispatch (future mode)
   * @default 'sync'
   */
  migrationMode?: 'sync' | 'hybrid' | 'async'

  /**
   * Enable deprecation warnings for synchronous event dispatch.
   * @default false
   */
  showDeprecationWarnings?: boolean

  /**
   * Enable Dead Letter Queue for failed events.
   * @default true
   */
  enableDLQ?: boolean

  /**
   * Configuration for the event priority queue (Backpressure).
   */
  queue?: EventQueueConfig

  /**
   * Custom event backend for distributed processing.
   */
  backend?: EventBackend

  /**
   * Database connection for persistent DLQ (optional).
   * If provided, failed events after max retries will be persisted to database.
   */
  db?: any

  /**
   * Enable persistent DLQ for failed events (requires db).
   * @default false
   */
  enablePersistentDLQ?: boolean

  /**
   * Message Queue Bridge for distributed event processing via Bull Queue.
   * When provided, enables dispatchQueued() method for routing events to Redis-backed queue.
   */
  messageQueueBridge?: any

  /**
   * Event aggregation configuration (FS-102).
   * Enables deduplication and micro-batching for improved throughput.
   */
  aggregation?: any
}
