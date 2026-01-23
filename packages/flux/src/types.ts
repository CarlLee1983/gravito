export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'suspended'
  | 'rolling_back'
  | 'rolled_back'

export interface FluxWaitResult {
  __kind: 'flux_wait'
  signal: string
}

export type StepHandlerResult =
  | void
  | undefined
  | FluxWaitResult
  | Promise<void | undefined | FluxWaitResult>

export interface StepResult<T = unknown> {
  success: boolean
  data?: T
  error?: Error
  duration: number
  suspended?: boolean
  waitingFor?: string
}

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

export interface StepDefinition<TInput = unknown, TData = Record<string, any>> {
  name: string
  handler: (ctx: WorkflowContext<TInput, TData>) => StepHandlerResult
  compensate?: (ctx: WorkflowContext<TInput, TData>) => Promise<void> | void
  retries?: number
  timeout?: number
  when?: (ctx: WorkflowContext<TInput, TData>) => boolean
  commit?: boolean
}

export interface WorkflowContext<TInput = unknown, TData = Record<string, any>> {
  readonly id: string
  readonly name: string
  readonly input: TInput
  data: TData
  readonly status: WorkflowStatus
  readonly currentStep: number
  readonly history: StepExecution[]
  readonly version: number
}

export interface WorkflowState<TInput = unknown, TData = Record<string, any>> {
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
  version: number
}

export interface WorkflowDefinition<TInput = unknown, TData = Record<string, any>> {
  name: string
  steps: StepDefinition<TInput, TData>[]
  validateInput?: (input: unknown) => input is TInput
}

export interface WorkflowDescriptor {
  name: string
  steps: StepDescriptor[]
}

export interface StepDescriptor {
  name: string
  commit: boolean
  retries?: number
  timeout?: number
  hasCondition: boolean
}

export interface WorkflowStorage {
  save(state: WorkflowState): Promise<void>
  load(id: string): Promise<WorkflowState | null>
  list(filter?: WorkflowFilter): Promise<WorkflowState[]>
  delete(id: string): Promise<void>
  init?(): Promise<void>
  close?(): Promise<void>
}

export interface WorkflowFilter {
  name?: string
  status?: WorkflowStatus | WorkflowStatus[]
  limit?: number
  offset?: number
}

export interface FluxLogger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

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

export interface FluxConfig {
  storage?: WorkflowStorage
  logger?: FluxLogger
  trace?: FluxTraceSink
  defaultRetries?: number
  defaultTimeout?: number
  parallel?: boolean
  on?: {
    stepStart?: (step: string, ctx: WorkflowContext) => void
    stepComplete?: (step: string, ctx: WorkflowContext, result: StepResult) => void
    stepError?: (step: string, ctx: WorkflowContext, error: Error) => void
    workflowComplete?: (ctx: WorkflowContext) => void
    workflowError?: (ctx: WorkflowContext, error: Error) => void
  }
}

export interface FluxResult<TData = Record<string, any>> {
  id: string
  status: WorkflowStatus
  data: TData
  history: StepExecution[]
  duration: number
  error?: Error
  version: number
}
