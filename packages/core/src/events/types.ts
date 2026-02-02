import type { ActionCallback } from '../HookManager'
import type { EventOptions } from './EventOptions'

/**
 * Event task for priority queue processing.
 * @internal
 */
export interface EventTask {
  /**
   * Unique identifier for this event task.
   */
  id: string

  /**
   * Event hook name.
   */
  hook: string

  /**
   * Event payload/arguments.
   */
  args: unknown

  /**
   * Event options.
   */
  options: EventOptions

  /**
   * Callbacks to execute for this event.
   */
  callbacks: ActionCallback[]

  /**
   * Timestamp when the event was created.
   */
  createdAt: number

  /**
   * Partition key for ordering (if applicable).
   */
  partitionKey?: string

  /**
   * Number of retry attempts made.
   * @internal
   */
  retryCount?: number

  /**
   * Timestamp when the event first failed.
   * @internal
   */
  firstFailedAt?: number

  /**
   * Last error encountered.
   * @internal
   */
  lastError?: Error
}

/**
 * Strategy for handling backpressure when the queue is full.
 */
export type BackpressureStrategy = 'reject' | 'drop-oldest' | 'drop-newest' | 'ignore'

/**
 * Configuration for the event priority queue.
 */
export interface EventQueueConfig {
  /**
   * Maximum number of pending events in the queue.
   * If exceeded, the backpressure strategy is applied.
   * @default undefined (unbounded)
   */
  maxSize?: number

  /**
   * Strategy to use when the queue is full.
   * - 'reject': Throw an error (default)
   * - 'drop-oldest': Drop the oldest lowest-priority event
   * - 'drop-newest': Drop the incoming event
   * - 'ignore': Silently drop the incoming event
   * @default 'reject'
   */
  strategy?: BackpressureStrategy
}
