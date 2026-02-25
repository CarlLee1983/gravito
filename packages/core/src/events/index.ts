/**
 * Event system exports for async event dispatch.
 * @packageDocumentation
 */

// ==================================================
// CORE EVENT SYSTEM - Microkernel Layer
// ==================================================

// Core foundations - kept in core for backwards compatibility
export * from './EventBackend'
export type { EventOptions } from './EventOptions'
export { DEFAULT_EVENT_OPTIONS } from './EventOptions'
export type { BackpressureStrategy, EventQueueConfig, EventTask } from './types'

// ==================================================
// NOTE: Resilience-related symbols have been moved to @gravito/resilience
// For deprecated re-exports, import from @gravito/core instead
// ==================================================
