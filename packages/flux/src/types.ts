/**
 * Represents the current lifecycle state of a workflow instance.
 * Used to track progress and determine valid state transitions.
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

/**
 * Signal payload returned by a step to pause execution until an external event occurs.
 * This enables long-running workflows that wait for human approval or webhooks.
 */
export interface FluxWaitResult {
  __kind: 'flux_wait'
  /** The unique identifier for the signal this workflow is waiting for. */
  signal: string
}

/**
 * The possible return values from a step handler.
 * Supports synchronous results, promises, and suspension signals.
 */
export type StepHandlerResult =
  | undefined
  | undefined
  | FluxWaitResult
  | Promise<undefined | undefined | FluxWaitResult>

/**
 * Internal representation of a step's execution outcome.
 * Captures performance metrics and state for persistence and observability.
 */
export interface StepResult<T = unknown> {
  /** Indicates if the step completed without unhandled exceptions. */
  success: boolean
  /** The data produced by the step, if any. */
  data?: T
  /** The error encountered during execution, if success is false. */
  error?: Error
  /** Execution time in milliseconds. */
  duration: number
  /** Whether the step requested workflow suspension. */
  suspended?: boolean
  /** The signal name if the step is suspended. */
  waitingFor?: string
}

/**
 * Audit log entry for a single step execution within a workflow.
 * Provides a historical record for debugging and compliance.
 */
export interface StepExecution {
  /** The unique name of the step as defined in the workflow. */
  name: string
  /** The execution outcome status. */
  status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'skipped'
    | 'suspended'
    | 'compensated'
    | 'compensating'
  /** ISO timestamp when the step started. */
  startedAt?: Date
  /** ISO timestamp when the step finished. */
  completedAt?: Date
  /** ISO timestamp when the step was suspended. */
  suspendedAt?: Date
  /** ISO timestamp when compensation logic finished. */
  compensatedAt?: Date
  /** The signal name if currently suspended. */
  waitingFor?: string
  /** Total execution time in milliseconds. */
  duration?: number
  /** Serialized output data from the step. */
  output?: any
  /** Error message if the step failed. */
  error?: string
  /** Number of retry attempts performed. */
  retries: number
}

/**
 * Configuration for a single unit of work within a workflow.
 * Defines the business logic, error handling, and execution conditions.
 */
export interface StepDefinition<TInput = unknown, TData = Record<string, any>> {
  /** Unique identifier for the step within the workflow. */
  name: string
  /**
   * The core business logic for this step.
   * @param ctx - The current workflow execution context.
   * @returns A result indicating completion or suspension.
   */
  handler: (ctx: WorkflowContext<TInput, TData>) => StepHandlerResult
  /**
   * Logic to execute if a subsequent step fails, enabling the Saga pattern.
   * @param ctx - The current workflow execution context.
   */
  compensate?: (ctx: WorkflowContext<TInput, TData>) => Promise<void> | void
  /** Maximum number of times to retry on failure before giving up. */
  retries?: number
  /** Maximum execution time in milliseconds before timing out. */
  timeout?: number
  /**
   * Predicate to determine if this step should be executed.
   * @param ctx - The current workflow execution context.
   * @returns True if the step should run.
   */
  when?: (ctx: WorkflowContext<TInput, TData>) => boolean
  /** If true, the step is considered a side-effect that should not be re-run on replay. */
  commit?: boolean
  /** If set, this step belongs to a parallel execution group with this ID. */
  parallelGroup?: string
}

/**
 * Shared state and utilities provided to every step during execution.
 * Acts as the "source of truth" for the current workflow run.
 */
export interface WorkflowContext<TInput = unknown, TData = Record<string, any>> {
  /** Unique UUID for this specific workflow instance. */
  readonly id: string
  /** The name of the workflow definition. */
  readonly name: string
  /** Immutable input data provided when the workflow started. */
  readonly input: TInput
  /** Mutable state shared across all steps in the workflow. */
  data: TData
  /** Current lifecycle status of the workflow. */
  readonly status: WorkflowStatus
  /** Zero-based index of the step currently being executed. */
  readonly currentStep: number
  /** Full history of all steps executed so far. */
  readonly history: StepExecution[]
  /** Optimistic locking version to prevent concurrent modification issues. */
  readonly version: number
}

/**
 * Persistable representation of a workflow's entire state.
 * This structure is what storage adapters save and load.
 */
export interface WorkflowState<TInput = unknown, TData = Record<string, any>> {
  /** Unique UUID for the workflow instance. */
  id: string
  /** Name of the workflow definition. */
  name: string
  /** Current lifecycle status. */
  status: WorkflowStatus
  /** Original input data. */
  input: TInput
  /** Current accumulated data. */
  data: TData
  /** Index of the next step to execute. */
  currentStep: number
  /** Audit trail of step executions. */
  history: StepExecution[]
  /** When the instance was first created. */
  createdAt: Date
  /** When the instance was last modified. */
  updatedAt: Date
  /** When the workflow reached a terminal state. */
  completedAt?: Date
  /** Final error message if the workflow failed. */
  error?: string
  /** Version number for concurrency control. */
  version: number
}

/**
 * The blueprint for a workflow, containing its name and ordered steps.
 */
export interface WorkflowDefinition<TInput = unknown, TData = Record<string, any>> {
  /** Unique name for this workflow type. */
  name: string
  /** Ordered list of steps to execute. */
  steps: StepDefinition<TInput, TData>[]
  /** Optional runtime validation for the workflow input. */
  validateInput?: (input: unknown) => input is TInput
}

/**
 * Metadata describing a workflow's structure for UI or documentation.
 */
export interface WorkflowDescriptor {
  /** Name of the workflow. */
  name: string
  /** Metadata for each step in the workflow. */
  steps: StepDescriptor[]
}

/**
 * Metadata describing a single step's configuration.
 */
export interface StepDescriptor {
  /** Name of the step. */
  name: string
  /** Whether the step is marked as a commit. */
  commit: boolean
  /** Configured retry limit. */
  retries?: number
  /** Configured timeout in milliseconds. */
  timeout?: number
  /** Whether the step has a conditional execution predicate. */
  hasCondition: boolean
}

/**
 * Interface for implementing custom persistence layers.
 * Allows workflows to survive process restarts and scale across nodes.
 */
export interface WorkflowStorage {
  /**
   * Persists the current state of a workflow.
   * @param state - The state to save.
   * @throws If the storage operation fails or version conflict occurs.
   */
  save(state: WorkflowState): Promise<void>
  /**
   * Retrieves a workflow state by its unique ID.
   * @param id - The workflow instance ID.
   * @returns The state if found, otherwise null.
   */
  load(id: string): Promise<WorkflowState | null>
  /**
   * Queries workflow instances based on filters.
   * @param filter - Criteria for selecting workflows.
   * @returns A list of matching workflow states.
   */
  list(filter?: WorkflowFilter): Promise<WorkflowState[]>
  /**
   * Permanently removes a workflow instance from storage.
   * @param id - The workflow instance ID.
   */
  delete(id: string): Promise<void>
  /** Optional initialization logic for the storage provider. */
  init?(): Promise<void>
  /** Optional cleanup logic for the storage provider. */
  close?(): Promise<void>
}

/**
 * Criteria for filtering workflow instances in storage queries.
 */
export interface WorkflowFilter {
  /** Filter by workflow definition name. */
  name?: string
  /** Filter by one or more lifecycle statuses. */
  status?: WorkflowStatus | WorkflowStatus[]
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip for pagination. */
  offset?: number
}

/**
 * Generic logging interface for the Flux engine.
 * Allows integration with various logging libraries (Pino, Winston, etc.).
 */
export interface FluxLogger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

/**
 * Enumeration of all observable events emitted by the engine.
 * Used for tracing, monitoring, and debugging.
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
 * A single telemetry event captured during workflow execution.
 */
export interface FluxTraceEvent {
  /** The type of event being recorded. */
  type: FluxTraceEventType
  /** Unix timestamp in milliseconds. */
  timestamp: number
  /** ID of the workflow instance. */
  workflowId: string
  /** Name of the workflow definition. */
  workflowName: string
  /** Name of the step, if applicable. */
  stepName?: string
  /** Index of the step, if applicable. */
  stepIndex?: number
  /** Whether the step was a commit. */
  commit?: boolean
  /** Current retry attempt number. */
  retries?: number
  /** Maximum allowed retries. */
  maxRetries?: number
  /** Duration of the operation in milliseconds. */
  duration?: number
  /** Error message if the event represents a failure. */
  error?: string
  /** Current status of the workflow or step. */
  status?: WorkflowStatus | StepExecution['status']
  /** Input data associated with the event. */
  input?: unknown
  /** Current workflow data associated with the event. */
  data?: Record<string, unknown>
  /** Additional contextual metadata. */
  meta?: Record<string, unknown>
}

/**
 * Destination for trace events, such as OpenTelemetry, ELK, or a simple console.
 */
export interface FluxTraceSink {
  /**
   * Processes a trace event.
   * @param event - The event to record.
   */
  emit(event: FluxTraceEvent): void | Promise<void>
}

/**
 * Global configuration for the Flux engine instance.
 */
export interface FluxConfig<TData = Record<string, any>> {
  /** Persistence provider for workflow states. */
  storage?: WorkflowStorage
  /** Logger for internal engine operations. */
  logger?: FluxLogger
  /** Telemetry sink for execution events. */
  trace?: FluxTraceSink
  /** Default retry limit for steps that don't specify one. */
  defaultRetries?: number
  /** Default timeout in milliseconds for steps that don't specify one. */
  defaultTimeout?: number
  /** Whether to allow parallel execution of independent workflows (if supported). */
  parallel?: boolean
  /** Lifecycle hooks for custom logic at specific execution points. */
  on?: {
    stepStart?: <TInput = unknown>(step: string, ctx: WorkflowContext<TInput, TData>) => void
    stepComplete?: <TInput = unknown>(
      step: string,
      ctx: WorkflowContext<TInput, TData>,
      result: StepResult
    ) => void
    stepError?: <TInput = unknown>(
      step: string,
      ctx: WorkflowContext<TInput, TData>,
      error: Error
    ) => void
    workflowComplete?: <TInput = unknown>(ctx: WorkflowContext<TInput, TData>) => void
    workflowError?: <TInput = unknown>(ctx: WorkflowContext<TInput, TData>, error: Error) => void
  }
}

/**
 * The final outcome of a workflow execution.
 */
export interface FluxResult<TData = Record<string, any>> {
  /** Unique ID of the workflow instance. */
  id: string
  /** Final lifecycle status. */
  status: WorkflowStatus
  /** Final state of the workflow data. */
  data: TData
  /** Full execution history. */
  history: StepExecution[]
  /** Total execution time in milliseconds. */
  duration: number
  /** The error that caused failure, if any. */
  error?: Error
  /** Final version of the workflow state. */
  version: number
}
