/**
 * @fileoverview Core type definitions for @gravito/flux
 *
 * Platform-agnostic workflow engine types.
 *
 * @module @gravito/flux
 */

// ─────────────────────────────────────────────────────────────
// Workflow Status
// ─────────────────────────────────────────────────────────────

/**
 * Workflow execution status
 */
export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'suspended'
  | 'rolling_back'
  | 'rolled_back'

// ─────────────────────────────────────────────────────────────
// Step Definitions
// ─────────────────────────────────────────────────────────────

/**
 * Result of Flux.wait()
 */
export interface FluxWaitResult {
  __kind: 'flux_wait'
  signal: string
}

/**
 * Step execution result
 */
export interface StepResult<T = unknown> {
  success: boolean
  data?: T
  error?: Error
  duration: number
  suspended?: boolean
  waitingFor?: string
}

/**
 * Step execution history entry
 */
export interface StepExecution {
  name: string
  status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'skipped'
    | 'suspended'
    | 'compensated'
    | 'compensating'
  startedAt?: Date
  completedAt?: Date
  suspendedAt?: Date
  compensatedAt?: Date
  waitingFor?: string
  duration?: number
  output?: any
  error?: string
  retries: number
}

/**
 * Step definition
 */
export interface StepDefinition<TInput = any, TData = any> {
  /** Step name (unique within workflow) */
  name: string

  /** Step handler function */
  handler: (
    ctx: WorkflowContext<TInput, TData>
  ) => Promise<void | FluxWaitResult> | void | FluxWaitResult

  /** Compensation handler to undo effects */
  compensate?: (ctx: WorkflowContext<TInput, TData>) => Promise<void> | void

  /** Number of retries on failure */
  retries?: number

  /** Timeout in milliseconds */
  timeout?: number

  /** Condition to skip this step */
  when?: (ctx: WorkflowContext<TInput, TData>) => boolean

  /** Mark as commit step (always executes even on replay) */
  commit?: boolean
}

// ─────────────────────────────────────────────────────────────
// Workflow Context
// ─────────────────────────────────────────────────────────────

/**
 * Workflow execution context
 *
 * Passed to each step handler with accumulated data.
 */
export interface WorkflowContext<TInput = unknown, TData = Record<string, unknown>> {
  /** Unique workflow instance ID */
  readonly id: string

  /** Workflow definition name */
  readonly name: string

  /** Original input data */
  readonly input: TInput

  /** Accumulated step data (mutable) */
  data: TData

  /** Current workflow status */
  readonly status: WorkflowStatus

  /** Current step index */
  readonly currentStep: number

  /** Step execution history */
  readonly history: StepExecution[]
}

// ─────────────────────────────────────────────────────────────
// Workflow State (Serializable)
// ─────────────────────────────────────────────────────────────

/**
 * Serializable workflow state for persistence
 */
export interface WorkflowState<TInput = any, TData = any> {
  id: string
  name: string
  status: WorkflowStatus
  input: TInput
  data: TData
  currentStep: number
  history: StepExecution[]
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  error?: string
}

// ─────────────────────────────────────────────────────────────
// Workflow Definition
// ─────────────────────────────────────────────────────────────

/**
 * Workflow definition (immutable blueprint)
 */
export interface WorkflowDefinition<TInput = unknown, TData = Record<string, unknown>> {
  /** Workflow name */
  name: string

  /** Step definitions in order */
  steps: StepDefinition<TInput, TData>[]

  /** Input schema validator (optional) */
  validateInput?: (input: unknown) => input is TInput
}

/**
 * Workflow descriptor (serializable metadata)
 */
export interface WorkflowDescriptor {
  name: string
  steps: StepDescriptor[]
}

/**
 * Step descriptor (serializable metadata)
 */
export interface StepDescriptor {
  name: string
  commit: boolean
  retries?: number
  timeout?: number
  hasCondition: boolean
}

// ─────────────────────────────────────────────────────────────
// Storage Interface
// ─────────────────────────────────────────────────────────────

/**
 * Workflow storage adapter interface
 */
export interface WorkflowStorage {
  /**
   * Save workflow state
   */
  save(state: WorkflowState): Promise<void>

  /**
   * Load workflow state by ID
   */
  load(id: string): Promise<WorkflowState | null>

  /**
   * List workflow states with optional filter
   */
  list(filter?: WorkflowFilter): Promise<WorkflowState[]>

  /**
   * Delete workflow state
   */
  delete(id: string): Promise<void>

  /**
   * Initialize storage (create tables, etc.)
   */
  init?(): Promise<void>

  /**
   * Cleanup storage resources
   */
  close?(): Promise<void>
}

/**
 * Workflow filter options
 */
export interface WorkflowFilter {
  name?: string
  status?: WorkflowStatus | WorkflowStatus[]
  limit?: number
  offset?: number
}

// ─────────────────────────────────────────────────────────────
// Logger Interface
// ─────────────────────────────────────────────────────────────

/**
 * Logger interface for FluxEngine
 *
 * Implement this to create custom loggers.
 *
 * @example
 * ```typescript
 * const engine = new FluxEngine({
 *   logger: new FluxConsoleLogger()
 * })
 * ```
 */
export interface FluxLogger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

// ─────────────────────────────────────────────────────────────
// Trace Types
// ─────────────────────────────────────────────────────────────

export type FluxTraceEventType =
  | 'workflow:start'
  | 'workflow:complete'
  | 'workflow:error'
  | 'workflow:rollback_start'
  | 'workflow:rollback_complete'
  | 'step:start'
  | 'step:complete'
  | 'step:error'
  | 'step:skipped'
  | 'step:retry'
  | 'step:suspend'
  | 'step:compensate'
  | 'signal:received'

export interface FluxTraceEvent {
  type: FluxTraceEventType
  timestamp: number
  workflowId: string
  workflowName: string
  stepName?: string
  stepIndex?: number
  commit?: boolean
  retries?: number
  maxRetries?: number
  duration?: number
  error?: string
  status?: WorkflowStatus | StepExecution['status']
  input?: unknown
  data?: Record<string, unknown>
  meta?: Record<string, unknown>
}

export interface FluxTraceSink {
  emit(event: FluxTraceEvent): void | Promise<void>
}

// ─────────────────────────────────────────────────────────────
// Engine Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Workflow engine configuration
 */
export interface FluxConfig {
  /** Storage adapter */
  storage?: WorkflowStorage

  /** Logger instance */
  logger?: FluxLogger

  /** Trace sink for workflow events */
  trace?: FluxTraceSink

  /** Default retry count for steps */
  defaultRetries?: number

  /** Default timeout for steps (ms) */
  defaultTimeout?: number

  /** Enable parallel execution for independent steps */
  parallel?: boolean

  /** Event handlers */
  on?: {
    stepStart?: (step: string, ctx: WorkflowContext) => void
    stepComplete?: (step: string, ctx: WorkflowContext, result: StepResult) => void
    stepError?: (step: string, ctx: WorkflowContext, error: Error) => void
    workflowComplete?: (ctx: WorkflowContext) => void
    workflowError?: (ctx: WorkflowContext, error: Error) => void
  }
}

// ─────────────────────────────────────────────────────────────
// Execution Result
// ─────────────────────────────────────────────────────────────

/**
 * Workflow execution result
 */
export interface FluxResult<TData = Record<string, unknown>> {
  /** Workflow instance ID */
  id: string

  /** Final status */
  status: WorkflowStatus

  /** Accumulated data from all steps */
  data: TData

  /** Step execution history */
  history: StepExecution[]

  /** Total execution duration (ms) */
  duration: number

  /** Error if failed */
  error?: Error
}
