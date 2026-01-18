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
/**
 * Workflow execution status lifecycle states.
 * @public
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
 * Result of the Flux.wait() signal.
 * Used to pause a workflow until an external event occurs.
 * @public
 */
export interface FluxWaitResult {
  __kind: 'flux_wait'
  /** The unique signal name to wait for */
  signal: string
}

/**
 * Detailed result of a single step's execution.
 * @public
 */
export interface StepResult<T = unknown> {
  /** Whether the step completed successfully */
  success: boolean
  /** Data returned by the step handler */
  data?: T
  /** Error encountered during execution */
  error?: Error
  /** Processing time in milliseconds */
  duration: number
  /** Whether the step triggered a suspension */
  suspended?: boolean
  /** If suspended, the signal name it is waiting for */
  waitingFor?: string
}

/**
 * Audit log entry for a step execution within a workflow instance.
 * @public
 */
export interface StepExecution {
  /** The unique name of the step */
  name: string
  /** Current state of this specific step execution */
  status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'skipped'
    | 'suspended'
    | 'compensated'
    | 'compensating'
  /** Timestamp when the step was first started */
  startedAt?: Date
  /** Timestamp when the step reached a terminal state */
  completedAt?: Date
  /** Timestamp when the step was suspended */
  suspendedAt?: Date
  /** Timestamp when the step was compensated (undone) */
  compensatedAt?: Date
  /** The signal name if the step is currently suspended */
  waitingFor?: string
  /** Execution time in milliseconds */
  duration?: number
  /** Serialized output data from the step */
  output?: any
  /** Serialized error message if failed */
  error?: string
  /** Number of times this step has been retried */
  retries: number
}

/**
 * Definition of a single functional unit (step) in a workflow.
 * @public
 */
export interface StepDefinition<TInput = any, TData = any> {
  /** Unique name for the step within the workflow */
  name: string

  /**
   * The primary logic of the step.
   * Can return a result, void, or a wait signal.
   */
  handler: (
    ctx: WorkflowContext<TInput, TData>
  ) => void | Promise<void | undefined | FluxWaitResult> | undefined | FluxWaitResult

  /**
   * Logic to undo the effects of this step if a later step fails.
   * Used in long-running transactions (Saga pattern).
   */
  compensate?: (ctx: WorkflowContext<TInput, TData>) => Promise<void> | void

  /** Maximum number of automatic retries on error (default: 0) */
  retries?: number

  /** Maximum execution time in milliseconds before timeout error */
  timeout?: number

  /** Predicate to determine if the step should be executed or skipped */
  when?: (ctx: WorkflowContext<TInput, TData>) => boolean

  /**
   * If true, this step is treated as a side-effect that has already happened.
   * It will NOT be re-executed during a workflow resumption/replay if it previously succeeded.
   */
  commit?: boolean
}

// ─────────────────────────────────────────────────────────────
// Workflow Context
// ─────────────────────────────────────────────────────────────

/**
 * The dynamic state and utility container passed to every step handler.
 * Provides access to input data, shared state, and orchestration metadata.
 * @public
 */
export interface WorkflowContext<TInput = unknown, TData = Record<string, unknown>> {
  /** Unique instance ID for this specific workflow run */
  readonly id: string

  /** Name of the workflow definition */
  readonly name: string

  /** The initial input data passed to the engine */
  readonly input: TInput

  /**
   * Mutable state shared across all steps.
   * Steps should write their results here to pass data to subsequent steps.
   */
  data: TData

  /** Current execution status of the entire workflow */
  readonly status: WorkflowStatus

  /** The 0-based index of the currently executing step */
  readonly currentStep: number

  /** History of all steps executed or currently running in this instance */
  readonly history: StepExecution[]
}

// ─────────────────────────────────────────────────────────────
// Workflow State (Serializable)
// ─────────────────────────────────────────────────────────────

/**
 * The complete, serializable state of a workflow instance.
 * Suitable for persistence in a database to support long-running processes.
 * @public
 */
export interface WorkflowState<TInput = any, TData = any> {
  /** Unique instance ID */
  id: string
  /** Name of the workflow definition */
  name: string
  /** Current lifecycle status */
  status: WorkflowStatus
  /** Original input data */
  input: TInput
  /** Current accumulated shared data */
  data: TData
  /** Index of the next step to execute */
  currentStep: number
  /** Full step execution history */
  history: StepExecution[]
  /** Creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
  /** Completion timestamp (if finished) */
  completedAt?: Date
  /** Final error message if failed */
  error?: string
}

// ─────────────────────────────────────────────────────────────
// Workflow Definition
// ─────────────────────────────────────────────────────────────

/**
 * The static blueprint defining a workflow's structure and behavior.
 * @public
 */
export interface WorkflowDefinition<TInput = unknown, TData = Record<string, unknown>> {
  /** Human-readable workflow identifier */
  name: string

  /** Sequential list of steps to execute */
  steps: StepDefinition<TInput, TData>[]

  /** Optional runtime validator for input data */
  validateInput?: (input: unknown) => input is TInput
}

/**
 * Lightweight, serializable overview of a workflow definition.
 * @public
 */
export interface WorkflowDescriptor {
  name: string
  steps: StepDescriptor[]
}

/**
 * Lightweight, serializable overview of a step definition.
 * @public
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
 * Interface for workflow persistence adapters.
 * Allows Flux to survive server restarts by saving state to a database.
 * @public
 */
export interface WorkflowStorage {
  /** Persist a workflow instance state */
  save(state: WorkflowState): Promise<void>

  /** Retrieve a workflow instance by its unique ID */
  load(id: string): Promise<WorkflowState | null>

  /** Search/list workflow instances based on criteria */
  list(filter?: WorkflowFilter): Promise<WorkflowState[]>

  /** Permanently remove a workflow instance record */
  delete(id: string): Promise<void>

  /** Prepare the storage backend (e.g., migrations) */
  init?(): Promise<void>

  /** Gracefully shut down storage connections */
  close?(): Promise<void>
}

/**
 * Query parameters for listing workflow instances.
 * @public
 */
export interface WorkflowFilter {
  /** Filter by workflow definition name */
  name?: string
  /** Filter by one or more statuses */
  status?: WorkflowStatus | WorkflowStatus[]
  /** Maximum number of records to return */
  limit?: number
  /** Number of records to skip */
  offset?: number
}

// ─────────────────────────────────────────────────────────────
// Logger Interface
// ─────────────────────────────────────────────────────────────

/**
 * Pluggable logger interface for the Flux engine.
 * @public
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

/**
 * Low-level event types emitted during workflow execution for observability.
 *
 * These types identify specific lifecycle events for both workflows and
 * individual steps, enabling fine-grained tracing and monitoring.
 *
 * @public
 * @since 3.0.0
 */
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

/**
 * A discrete event representing a change in workflow or step state.
 *
 * Trace events provide a comprehensive audit log of everything that happens
 * during a workflow execution, including performance metrics (duration),
 * error details, and captured data snapshots.
 *
 * @public
 * @since 3.0.0
 */
export interface FluxTraceEvent {
  /** The type of event */
  type: FluxTraceEventType
  /** Epoch timestamp in milliseconds */
  timestamp: number
  /** Unique ID of the affected workflow instance */
  workflowId: string
  /** Name of the affected workflow definition */
  workflowName: string
  /** Name of the step (if applicable) */
  stepName?: string
  /** 0-based index of the step (if applicable) */
  stepIndex?: number
  /** Whether the step was a commit step */
  commit?: boolean
  /** Current retry attempt count */
  retries?: number
  /** Limit of retries configured */
  maxRetries?: number
  /** Duration of the operation in milliseconds */
  duration?: number
  /** Error message (if applicable) */
  error?: string
  /** The new status reached */
  status?: WorkflowStatus | StepExecution['status']
  /** Captured input (if tracing enabled) */
  input?: unknown
  /** Captured partial data (if tracing enabled) */
  data?: Record<string, unknown>
  /** Additional custom metadata */
  meta?: Record<string, unknown>
}

/**
 * Destination for trace events (e.g., Log file, OpenTelemetry, Zipkin).
 *
 * Implement this interface to create custom observability adapters for Flux.
 *
 * @example
 * ```typescript
 * class MyTraceSink implements FluxTraceSink {
 *   emit(event: FluxTraceEvent) {
 *     console.log(`[Flux Trace] ${event.type} in ${event.workflowName}`);
 *   }
 * }
 * ```
 *
 * @public
 * @since 3.0.0
 */
export interface FluxTraceSink {
  /**
   * Emit a trace event to the sink.
   *
   * @param event - The trace event to process.
   */
  emit(event: FluxTraceEvent): void | Promise<void>
}

// ─────────────────────────────────────────────────────────────
// Engine Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Global configuration for a FluxEngine instance.
 * @public
 */
export interface FluxConfig {
  /** The persistence adapter to use (default: MemoryStorage) */
  storage?: WorkflowStorage

  /** The logger to use for engine internals */
  logger?: FluxLogger

  /** The observability sink for trace events */
  trace?: FluxTraceSink

  /** Global default retry count for all steps (default: 0) */
  defaultRetries?: number

  /** Global default timeout in ms for all steps (default: no timeout) */
  defaultTimeout?: number

  /**
   * Experimental: Attempt to execute independent steps in parallel.
   * (Standard workflows execute sequentially).
   */
  parallel?: boolean

  /** Functional hooks for reacting to engine events */
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
 * The result returned after executing or resuming a workflow.
 * @public
 */
export interface FluxResult<TData = Record<string, unknown>> {
  /** Unique instance ID of the execution */
  id: string

  /** Terminal status (e.g., 'completed', 'failed', 'suspended') */
  status: WorkflowStatus

  /** The final state of the shared data map */
  data: TData

  /** Full execution history including all step outcomes */
  history: StepExecution[]

  /** Wall-clock time of the execution session in milliseconds */
  duration: number

  /** The final error that halted the workflow (if applicable) */
  error?: Error
}
