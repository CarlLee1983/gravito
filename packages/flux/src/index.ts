/**
 * @fileoverview @gravito/flux - Platform-agnostic Workflow Engine
 *
 * High-performance, type-safe workflow engine with Bun optimizations.
 *
 * @example Basic Usage
 * ```typescript
 * import { FluxEngine, createWorkflow } from '@gravito/flux'
 *
 * const workflow = createWorkflow('order-process')
 *   .input<{ orderId: string }>()
 *   .step('validate', async (ctx) => {
 *     ctx.data.order = await fetchOrder(ctx.input.orderId)
 *   })
 *   .step('process', async (ctx) => {
 *     await processPayment(ctx.data.order)
 *   })
 *   .commit('notify', async (ctx) => {
 *     await sendEmail(ctx.data.order.email)
 *   })
 *
 * const engine = new FluxEngine()
 * const result = await engine.execute(workflow, { orderId: '123' })
 * ```
 *
 * @module @gravito/flux
 */

// Builder
export { createWorkflow, WorkflowBuilder } from './builder/WorkflowBuilder'
export { ContextManager } from './core/ContextManager'
// Core (for advanced usage)
export { StateMachine } from './core/StateMachine'
export { StepExecutor } from './core/StepExecutor'
// Core
export { FluxEngine } from './engine/FluxEngine'
// Logger
export { FluxConsoleLogger, FluxSilentLogger } from './logger/FluxLogger'
// Gravito Integration
export { OrbitFlux, type OrbitFluxOptions } from './orbit/OrbitFlux'
// Profiler
export {
  type ProfileMetrics,
  type ProfileRecommendation,
  WorkflowProfiler,
} from './profiler/WorkflowProfiler'
export { BunSQLiteStorage, type BunSQLiteStorageOptions } from './storage/BunSQLiteStorage'
// Storage
export { MemoryStorage } from './storage/MemoryStorage'
// Trace
export { JsonFileTraceSink } from './trace/JsonFileTraceSink'

// Types
export type {
  // Config
  FluxConfig,
  // Logger
  FluxLogger,
  FluxResult,
  // Trace
  FluxTraceEvent,
  FluxTraceEventType,
  FluxTraceSink,
  // Helper
  FluxWaitResult,
  // Step types
  StepDefinition,
  StepDescriptor,
  StepExecution,
  StepResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowDescriptor,
  WorkflowFilter,
  WorkflowState,
  // Core types
  WorkflowStatus,
  // Storage
  WorkflowStorage,
} from './types'

/**
 * Flux helper utilities
 */
export const Flux = {
  /**
   * Suspend workflow execution and wait for a signal
   *
   * @param signal - Signal name to wait for
   */
  wait: (signal: string): import('./types').FluxWaitResult => ({
    __kind: 'flux_wait',
    signal,
  }),
}
