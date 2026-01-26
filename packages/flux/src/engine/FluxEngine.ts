import type { WorkflowBuilder } from '../builder/WorkflowBuilder'
import { ContextManager } from '../core/ContextManager'
import { StateMachine } from '../core/StateMachine'
import * as Errors from '../errors'
import { MemoryStorage } from '../storage/MemoryStorage'
import type {
  FluxConfig,
  FluxResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowState,
  WorkflowStorage,
} from '../types'
import {
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

  /**
   * Initializes a new instance of the FluxEngine.
   *
   * @param config - Configuration options for the engine, including storage and retry policies.
   */
  constructor(config: FluxConfig = {}) {
    this.storage = config.storage ?? new MemoryStorage()
    this.contextManager = new ContextManager()
    this.traceEmitter = new TraceEmitter(config.trace)

    const stepExecutor = createStepExecutor(config, this.traceEmitter)
    const persist = (ctx: WorkflowContext<any, any>) => this.persist(ctx)

    this.executor = new WorkflowExecutor(
      this.storage,
      this.contextManager,
      stepExecutor,
      this.traceEmitter,
      config,
      persist
    )

    this.rollbackManager = new RollbackManager(
      this.storage,
      this.contextManager,
      this.traceEmitter,
      persist
    )
  }

  /**
   * Starts the execution of a workflow from the beginning.
   *
   * @param workflow - The workflow definition or builder to execute.
   * @param input - The initial data required by the workflow.
   * @returns A promise that resolves to the final result of the workflow execution.
   */
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

    const result = await this.executor.execute(definition, ctx, new StateMachine(), startTime, 0)
    return handleExecutionResult(definition, ctx, result, this.contextManager, this.rollbackManager)
  }

  /**
   * Resumes a previously interrupted or failed workflow.
   *
   * @param workflow - The workflow definition or builder.
   * @param workflowId - The unique identifier of the workflow instance to resume.
   * @param options - Optional parameters to specify the starting point.
   * @returns The result of the resumed execution, or null if the workflow state is not found.
   */
  async resume<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    workflowId: string,
    options?: { fromStep?: number | string }
  ): Promise<FluxResult<TData> | null> {
    const definition = resolveDefinition(workflow)
    const state = await this.storage.load(workflowId)
    if (!state || state.name !== definition.name) {
      if (!state) return null
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
    return handleExecutionResult(definition, ctx, result, this.contextManager, this.rollbackManager)
  }

  /**
   * Sends an external signal to a suspended workflow.
   *
   * @param workflow - The workflow definition or builder.
   * @param workflowId - The unique identifier of the suspended workflow.
   * @param signalName - The name of the signal the workflow is waiting for.
   * @param payload - Optional data to pass along with the signal.
   * @returns The result of the workflow execution after receiving the signal.
   */
  async signal<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    workflowId: string,
    signalName: string,
    payload?: any
  ): Promise<FluxResult<TData>> {
    const definition = resolveDefinition(workflow)
    const state = await this.storage.load(workflowId)
    if (!state) throw Errors.workflowNotFound(workflowId)
    if (state.status !== 'suspended') throw Errors.workflowNotSuspended(state.status)

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
    return handleExecutionResult(definition, ctx, result, this.contextManager, this.rollbackManager)
  }

  /**
   * Retries a specific step in a failed or suspended workflow.
   *
   * @param workflow - The workflow definition or builder.
   * @param workflowId - The unique identifier of the workflow.
   * @param stepName - The name of the step to retry.
   * @returns The result of the execution after the retry, or null if the workflow is not found.
   */
  async retryStep<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    workflowId: string,
    stepName: string
  ): Promise<FluxResult<TData> | null> {
    const definition = resolveDefinition(workflow)
    const state = await this.storage.load(workflowId)
    if (!state || state.name !== definition.name) {
      if (!state) return null
      throw Errors.workflowNameMismatch(definition.name, state.name)
    }
    if (state.history.length !== definition.steps.length) throw Errors.workflowDefinitionChanged()

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
    return handleExecutionResult(definition, ctx, result, this.contextManager, this.rollbackManager)
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

  /**
   * Manually saves a workflow state to storage.
   *
   * @param state - The workflow state to persist.
   * @throws {FluxError} If a concurrent modification is detected.
   */
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

  /**
   * Lists workflow instances based on the provided filter.
   *
   * @param filter - Criteria to filter the workflow list.
   * @returns A list of workflow states matching the filter.
   */
  async list(filter?: Parameters<WorkflowStorage['list']>[0]) {
    return this.storage.list(filter)
  }

  /**
   * Initializes the engine and its underlying storage.
   */
  async init(): Promise<void> {
    await this.storage.init?.()
  }

  /**
   * Closes the engine and releases storage resources.
   */
  async close(): Promise<void> {
    await this.storage.close?.()
  }

  private async persist<TInput, TData extends Record<string, any>>(
    ctx: WorkflowContext<TInput, TData>
  ): Promise<WorkflowContext<TInput, TData>> {
    return persistContext(ctx, this.storage, this.contextManager)
  }
}
