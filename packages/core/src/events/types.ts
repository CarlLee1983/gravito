import type { ActionCallback } from '../HookManager'
import type { BackpressureConfig } from './BackpressureManager'
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
   * Timestamp when the event was enqueued (added to the queue).
   * Used for priority escalation calculations.
   * @internal
   */
  enqueuedAt: number

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

  /**
   * Advanced backpressure management configuration.
   * When enabled, provides state-based flow control with multi-strategy support.
   * If not provided, falls back to simple strategy-based backpressure.
   * @default undefined (disabled, uses simple strategy)
   */
  backpressure?: BackpressureConfig
}

/**
 * Multi-priority queue depth snapshot (FS-103)
 * Represents the current queue depth for each priority level.
 * @internal
 */
export interface MultiPriorityQueueDepth {
  /** Queue depth for CRITICAL priority events */
  critical: number
  /** Queue depth for HIGH priority events */
  high: number
  /** Queue depth for NORMAL priority events */
  normal: number
  /** Queue depth for LOW priority events */
  low: number
  /** Total queue depth across all priorities */
  total: number
}

/**
 * Window adjustment record for backpressure feedback (FS-103)
 * Records when and why the aggregation window was adjusted.
 * @internal
 */
export interface WindowAdjustment {
  /** Timestamp of the adjustment */
  timestamp: number
  /** Previous window size in milliseconds */
  from: number
  /** New window size in milliseconds */
  to: number
  /** Backpressure state that triggered the adjustment */
  reason: string
}

/**
 * Dead letter queue routing decision (FS-103)
 * Determines whether an event should be routed to the DLQ.
 * @internal
 */
export interface DeadLetterDecision {
  /** Whether the event should be routed to DLQ */
  shouldRoute: boolean
  /** Reason for the decision (if applicable) */
  reason?: string
  /** Suggested retry strategy */
  retryStrategy?: 'immediate' | 'delayed' | 'dlq-only'
}
