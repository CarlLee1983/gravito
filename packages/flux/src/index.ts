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
export { BunSQLiteStorage, type BunSQLiteStorageOptions } from './storage/BunSQLiteStorage'
// Storage
export { MemoryStorage } from './storage/MemoryStorage'

// Types
export type {
  // Config
  FluxConfig,
  // Logger
  FluxLogger,
  FluxResult,
  // Step types
  StepDefinition,
  StepExecution,
  StepResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowFilter,
  WorkflowState,
  // Core types
  WorkflowStatus,
  // Storage
  WorkflowStorage,
} from './types'
