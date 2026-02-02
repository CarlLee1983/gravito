import type { WorkflowBuilder } from '../builder/WorkflowBuilder'
import { ContextManager } from '../core/ContextManager'
import { DataOptimizer } from '../core/DataOptimizer'
import { StateMachine } from '../core/StateMachine'
import { CompensationRetryPolicy } from '../engine/CompensationRetryPolicy'
import * as Errors from '../errors'
import { CronTrigger } from '../orbit/CronTrigger'
import { MemoryStorage } from '../storage/MemoryStorage'
import type {
  CronScheduleOptions,
  FluxConfig,
  FluxResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowState,
  WorkflowStorage,
} from '../types'
import {
  acquireEngineLock,
  createStepExecutor,
  handleExecutionResult,
  persistContext,
  resetHistoryFrom,
  resolveDefinition,
  resolveStartIndex,
} from './FluxEngineHelpers'
import { RollbackManager } from './RollbackManager'
import { updateWorkflowContext } from './stateUpdater'
import { TraceEmitter } from './TraceEmitter'
import { WorkflowExecutor } from './WorkflowExecutor'

/**
 * The core execution engine for Flux workflows.
 *
 * FluxEngine manages the lifecycle of workflow execution, including persistence,
 * state transitions, retries, and compensation (rollback) logic. It acts as the
 * primary entry point for interacting with the workflow system.
 *
 * @example
 * ```typescript
 * const engine = new FluxEngine({
 *   storage: new MemoryStorage(),
 *   defaultRetries: 3
 * });
 * await engine.init();
 * const result = await engine.execute(myWorkflow, { userId: '123' });
 * ```
 */
export class FluxEngine {
  private storage: WorkflowStorage
  private contextManager: ContextManager
  private traceEmitter: TraceEmitter
  private executor: WorkflowExecutor
  private rollbackManager: RollbackManager
  private cronTrigger: CronTrigger
  private dataOptimizer?: DataOptimizer

  constructor(config: FluxConfig = {}) {
    this.storage = config.storage ?? new MemoryStorage()
    this.contextManager = new ContextManager()
    this.traceEmitter = new TraceEmitter(config.trace)

    if (config.optimizer?.enabled) {
      this.dataOptimizer = new DataOptimizer({
        threshold: config.optimizer.threshold,
        defaultLocation: config.optimizer.defaultLocation,
      })
    }

    const stepExecutor = createStepExecutor(config, this.traceEmitter)
    const persist = (ctx: WorkflowContext<any, any>) => this.persist(ctx)

    this.executor = new WorkflowExecutor(
      this.storage,
      this.contextManager,
      stepExecutor,
      this.traceEmitter,
      config,
      persist,
      this.dataOptimizer
    )

    this.rollbackManager = new RollbackManager(
      this.storage,
      this.contextManager,
      this.traceEmitter,
      persist,
      {
        retryPolicy: new CompensationRetryPolicy({
          maxAttempts: config.defaultRetries !== undefined ? config.defaultRetries : 3,
        }),
      }
    )

    this.cronTrigger = new CronTrigger(this)
    this.config = config
  }

  private config: FluxConfig

  async execute<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    input: TInput
  ): Promise<FluxResult<TData>> {
    const startTime = Date.now()
    const definition = resolveDefinition(workflow)

    if (definition.validateInput && !definition.validateInput(input)) {
      throw Errors.invalidInput(definition.name)
    }

    let ctx = this.contextManager.create<TInput, TData>(
      definition.name,
      input,
      definition.steps.length
    ) as WorkflowContext<TInput, TData>

    ctx = await this.persist(ctx)

    const lock = await acquireEngineLock(this.config, ctx.id)
    try {
      const result = await this.executor.execute(definition, ctx, new StateMachine(), startTime, 0)
      return handleExecutionResult(
        definition,
        ctx,
        result,
        this.contextManager,
        this.rollbackManager,
        this.storage
      )
    } finally {
      await lock?.release()
    }
  }

  async resume<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    workflowId: string,
    options?: { fromStep?: number | string }
  ): Promise<FluxResult<TData> | null> {
    const definition = resolveDefinition(workflow)
    const state = await this.storage.load(workflowId)
    if (!state || state.name !== definition.name) {
      if (!state) {
        return null
      }
      throw Errors.workflowNameMismatch(definition.name, state.name)
    }
    if (state.history.length !== definition.steps.length) {
      throw Errors.workflowDefinitionChanged()
    }

    let ctx = this.contextManager.restore<TInput, TData>(
      state as unknown as WorkflowState<TInput, TData>
    )
    const startIndex = resolveStartIndex(definition, options?.fromStep, ctx.currentStep)
    resetHistoryFrom(ctx, startIndex)
    ctx = updateWorkflowContext(ctx, { status: 'pending', currentStep: startIndex })

    ctx = await this.persist(ctx)

    const lock = await acquireEngineLock(this.config, ctx.id)
    try {
      const result = await this.executor.execute(
        definition,
        ctx,
        new StateMachine(),
        Date.now(),
        startIndex,
        {
          resume: true,
          fromStep: startIndex,
        }
      )
      return handleExecutionResult(
        definition,
        ctx,
        result,
        this.contextManager,
        this.rollbackManager,
        this.storage
      )
    } finally {
      await lock?.release()
    }
  }

  async signal<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    workflowId: string,
    signalName: string,
    payload?: any
  ): Promise<FluxResult<TData>> {
    const definition = resolveDefinition(workflow)
    const state = await this.storage.load(workflowId)
    if (!state) {
      throw Errors.workflowNotFound(workflowId)
    }
    if (state.status !== 'suspended') {
      throw Errors.workflowNotSuspended(state.status)
    }

    let ctx = this.contextManager.restore<TInput, TData>(
      state as unknown as WorkflowState<TInput, TData>
    )
    const currentStepIndex = ctx.currentStep
    let execution = ctx.history[currentStepIndex]

    if (!execution || execution.status !== 'suspended' || execution.waitingFor !== signalName) {
      throw new Errors.FluxError(
        !execution || execution.status !== 'suspended'
          ? 'Workflow state invalid: no suspended step found'
          : `Workflow waiting for signal "${execution.waitingFor}", received "${signalName}"`,
        !execution || execution.status !== 'suspended'
          ? Errors.FluxErrorCode.STEP_NOT_FOUND
          : Errors.FluxErrorCode.INVALID_STATE_TRANSITION
      )
    }

    execution = { ...execution, status: 'completed', completedAt: new Date(), output: payload }
    ctx = updateWorkflowContext(ctx, {
      history: ctx.history.map((h, i) => (i === currentStepIndex ? execution : h)),
    })

    await this.traceEmitter.emit({
      type: 'signal:received',
      timestamp: Date.now(),
      workflowId: ctx.id,
      workflowName: ctx.name,
      status: 'suspended',
      input: payload,
    })

    const nextStepIndex = currentStepIndex + 1
    const result = await this.executor.execute(
      definition,
      ctx,
      new StateMachine(),
      Date.now(),
      nextStepIndex,
      {
        resume: true,
        fromStep: nextStepIndex,
      }
    )
    return handleExecutionResult(
      definition,
      ctx,
      result,
      this.contextManager,
      this.rollbackManager,
      this.storage
    )
  }

  async retryStep<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    workflowId: string,
    stepName: string
  ): Promise<FluxResult<TData> | null> {
    const definition = resolveDefinition(workflow)
    const state = await this.storage.load(workflowId)
    if (!state || state.name !== definition.name) {
      if (!state) {
        return null
      }
      throw Errors.workflowNameMismatch(definition.name, state.name)
    }
    if (state.history.length !== definition.steps.length) {
      throw Errors.workflowDefinitionChanged()
    }

    let ctx = this.contextManager.restore<TInput, TData>(
      state as unknown as WorkflowState<TInput, TData>
    )
    const startIndex = resolveStartIndex(definition, stepName, ctx.currentStep)
    resetHistoryFrom(ctx, startIndex)
    ctx = updateWorkflowContext(ctx, { status: 'pending', currentStep: startIndex })
    ctx = await this.persist(ctx)

    const result = await this.executor.execute(
      definition,
      ctx,
      new StateMachine(),
      Date.now(),
      startIndex,
      {
        retry: true,
        fromStep: startIndex,
      }
    )
    return handleExecutionResult(
      definition,
      ctx,
      result,
      this.contextManager,
      this.rollbackManager,
      this.storage
    )
  }

  /**
   * Retrieves the current state of a workflow instance from storage.
   *
   * @param workflowId - The unique identifier of the workflow.
   * @returns A promise resolving to the workflow state or null if not found.
   */
  async get<TInput = any, TData = any>(
    workflowId: string
  ): Promise<WorkflowState<TInput, TData> | null> {
    return this.storage.load(workflowId) as Promise<WorkflowState<TInput, TData> | null>
  }

  async saveState<TInput, TData extends Record<string, any>>(
    state: WorkflowState<TInput, TData>
  ): Promise<void> {
    const stored = await this.storage.load(state.id)
    if (stored && stored.version !== state.version) {
      throw new Errors.FluxError(
        'Concurrent modification detected',
        Errors.FluxErrorCode.CONCURRENT_MODIFICATION
      )
    }
    return this.storage.save({ ...state, version: state.version + 1 } as WorkflowState)
  }

  async list(filter?: Parameters<WorkflowStorage['list']>[0]) {
    return this.storage.list(filter)
  }

  schedule<TInput, TData extends Record<string, any>>(
    cron: string,
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    input: TInput,
    id = `schedule_${Date.now()}`
  ): string {
    this.cronTrigger.addSchedule({
      id,
      cron,
      workflow: resolveDefinition(workflow) as any,
      input,
      enabled: true,
    })
    return id
  }

  unschedule(id: string): void {
    this.cronTrigger.removeSchedule(id)
  }

  /**
   * Lists all active workflow schedules.
   */
  listSchedules(): CronScheduleOptions[] {
    return this.cronTrigger.listSchedules()
  }

  /**
   * Gets the recovery manager for handling manual intervention.
   */
  getRecoveryManager() {
    return this.rollbackManager.getRecoveryManager()
  }

  /**
   * Gets the lock provider used for cluster mode.
   */
  getLockProvider() {
    return this.config.lockProvider
  }

  /**
   * Initializes the engine and its underlying storage, and starts the scheduler.
   */
  async init(): Promise<void> {
    await this.storage.init?.()
    this.cronTrigger.start()
  }

  /**
   * Closes the engine and releases storage resources.
   */
  async close(): Promise<void> {
    this.cronTrigger.stop()
    await this.storage.close?.()
  }

  private async persist<TInput, TData extends Record<string, any>>(
    ctx: WorkflowContext<TInput, TData>
  ): Promise<WorkflowContext<TInput, TData>> {
    return persistContext(ctx, this.storage, this.contextManager)
  }
}
