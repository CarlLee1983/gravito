/**
 * @fileoverview Node.js compatible entry point
 *
 * This entry exports only platform-agnostic components.
 * BunSQLiteStorage is NOT included (use main entry for Bun).
 *
 * @module @gravito/flux
 */

// Builder
export { createWorkflow, WorkflowBuilder } from './builder/WorkflowBuilder'
export {
  type BatchExecutionOptions,
  BatchExecutor,
  type BatchItemResult,
  type BatchResult,
} from './engine/BatchExecutor'
// Core
export { FluxEngine } from './engine/FluxEngine'

// Storage (Node-compatible only)
export { MemoryStorage } from './storage/MemoryStorage'
export { PostgreSQLStorage, type PostgreSQLStorageOptions } from './storage/PostgreSQLStorage'
// Trace
export { JsonFileTraceSink } from './trace/JsonFileTraceSink'

// Note: BunSQLiteStorage is NOT exported here (Bun-only)

export { ContextManager } from './core/ContextManager'
export { type Lock, type LockProvider, MemoryLockProvider } from './core/LockProvider'
export {
  type RedisClient,
  RedisLockProvider,
  type RedisLockProviderOptions,
} from './core/RedisLockProvider'
// Core (for advanced usage)
export { StateMachine } from './core/StateMachine'
export { StepExecutor } from './core/StepExecutor'
// Logger
export { FluxConsoleLogger, FluxSilentLogger } from './logger/FluxLogger'
// Gravito Integration
export { OrbitFlux, type OrbitFluxOptions } from './orbit/OrbitFlux'

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
