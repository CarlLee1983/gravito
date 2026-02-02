/**
 * Event system exports for async event dispatch.
 * @packageDocumentation
 */

export type { CircuitBreakerOptions } from './CircuitBreaker'
export { CircuitBreaker, CircuitBreakerState } from './CircuitBreaker'
export type { DLQEntry, DLQFilter } from './DeadLetterQueue'
export { DeadLetterQueue } from './DeadLetterQueue'
export type { EventBackend } from './EventBackend'
export type { EventOptions } from './EventOptions'
export { DEFAULT_EVENT_OPTIONS } from './EventOptions'
export { EventPriorityQueue } from './EventPriorityQueue'
export type { BackpressureStrategy, EventQueueConfig, EventTask } from './types'
