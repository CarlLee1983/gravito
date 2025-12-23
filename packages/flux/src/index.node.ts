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
// Core
export { FluxEngine } from './engine/FluxEngine'

// Storage (Node-compatible only)
export { MemoryStorage } from './storage/MemoryStorage'

// Note: BunSQLiteStorage is NOT exported here (Bun-only)

export { ContextManager } from './core/ContextManager'
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
