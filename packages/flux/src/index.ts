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
// Errors
export {
  cannotRemoveRoot,
  cannotReplaceRoot,
  emptyWorkflow,
  FluxError,
  FluxErrorCode,
  invalidInput,
  invalidJsonPointer,
  invalidPathTraversal,
  invalidStateTransition,
  invalidStepIndex,
  noRecoveryAction,
  stepNotFound,
  workflowDefinitionChanged,
  workflowNameMismatch,
  workflowNotFound,
  workflowNotSuspended,
} from './errors'
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
export { PostgreSQLStorage, type PostgreSQLStorageOptions } from './storage/PostgreSQLStorage'
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
// Visualization
export { MermaidGenerator, type MermaidOptions } from './visualization/MermaidGenerator'

/**
 * Flux helper utilities for workflow control flow.
 *
 * Provides methods to interact with the workflow engine's special behaviors,
 * such as suspending execution to wait for external signals.
 */
export const Flux = {
  /**
   * Suspends workflow execution until a specific signal is received.
   *
   * When a handler returns this result, the engine saves the current state
   * and stops execution. The workflow can be resumed later using `engine.signal()`.
   *
   * @param signal - The unique identifier for the signal to wait for.
   * @returns A special result object that instructs the engine to suspend.
   *
   * @example
   * ```typescript
   * .step('wait-for-approval', async (ctx) => {
   *   return Flux.wait('manager-approval');
   * })
   * ```
   */
  wait: (signal: string): import('./types').FluxWaitResult => ({
    __kind: 'flux_wait',
    signal,
  }),
}
