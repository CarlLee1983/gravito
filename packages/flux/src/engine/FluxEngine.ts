import { WorkflowBuilder } from '../builder/WorkflowBuilder'
import { ContextManager } from '../core/ContextManager'
import { StateMachine } from '../core/StateMachine'
import { StepExecutor } from '../core/StepExecutor'
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

    const stepExecutor = new StepExecutor({
      defaultRetries: config.defaultRetries,
      defaultTimeout: config.defaultTimeout,
      onRetry: async (step, ctx, error, attempt, maxRetries) => {
        await this.traceEmitter.emit({
          type: 'step:retry',
          timestamp: Date.now(),
          workflowId: ctx.id,
          workflowName: ctx.name,
          stepName: step.name,
          stepIndex: ctx.currentStep,
          commit: Boolean(step.commit),
          retries: attempt,
          maxRetries,
          error: error.message,
          status: 'running',
        })
      },
    })

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
   * This method creates a new workflow instance, validates the input, and
   * orchestrates the execution of all defined steps.
   *
   * @param workflow - The workflow definition or builder to execute.
   * @param input - The initial data required by the workflow.
   * @returns A promise that resolves to the final result of the workflow execution.
   * @throws {FluxError} If the input validation fails or if a concurrent modification is detected during persistence.
   *
   * @example
   * ```typescript
   * const result = await engine.execute(orderWorkflow, { orderId: 'ORD-001' });
   * if (result.status === 'completed') {
   *   console.log('Order processed:', result.data);
   * }
   * ```
   */
  async execute<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    input: TInput
  ): Promise<FluxResult<TData>> {
    const startTime = Date.now()
    const definition = this.resolveDefinition(workflow)

    if (definition.validateInput && !definition.validateInput(input)) {
      throw Errors.invalidInput(definition.name)
    }

    let ctx = this.contextManager.create<TInput, TData>(
      definition.name,
      input,
      definition.steps.length
    ) as WorkflowContext<TInput, TData>

    const stateMachine = new StateMachine()

    ctx = await this.persist(ctx)

    const result = await this.executor.execute(definition, ctx, stateMachine, startTime, 0)
    return this.handleResult(definition, ctx, result)
  }

  /**
   * Resumes a previously interrupted or failed workflow.
   *
   * This is useful for recovering from system crashes or manual interventions.
   * The engine will reload the state from storage and continue from the specified step.
   *
   * @param workflow - The workflow definition or builder.
   * @param workflowId - The unique identifier of the workflow instance to resume.
   * @param options - Optional parameters to specify the starting point.
   * @returns The result of the resumed execution, or null if the workflow state is not found.
   * @throws {FluxError} If the workflow name mismatches or the definition has changed since the last save.
   *
   * @example
   * ```typescript
   * await engine.resume(orderWorkflow, 'workflow-id-123', { fromStep: 'payment' });
   * ```
   */
  async resume<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    workflowId: string,
    options?: { fromStep?: number | string }
  ): Promise<FluxResult<TData> | null> {
    const definition = this.resolveDefinition(workflow)
    const state = await this.storage.load(workflowId)
    if (!state) {
      return null
    }
    if (state.name !== definition.name) {
      throw Errors.workflowNameMismatch(definition.name, state.name)
    }
    if (state.history.length !== definition.steps.length) {
      throw Errors.workflowDefinitionChanged()
    }

    let ctx = this.contextManager.restore<TInput, TData>(
      state as unknown as WorkflowState<TInput, TData>
    )
    const stateMachine = new StateMachine()
    stateMachine.forceStatus('pending')

    const startIndex = this.resolveStartIndex(definition, options?.fromStep, ctx.currentStep)
    this.resetHistoryFrom(ctx, startIndex)
    ctx = updateWorkflowContext(ctx, { status: 'pending', currentStep: startIndex })

    ctx = await this.persist(ctx)

    const result = await this.executor.execute(
      definition,
      ctx,
      stateMachine,
      Date.now(),
      startIndex,
      {
        resume: true,
        fromStep: startIndex,
      }
    )
    return this.handleResult(definition, ctx, result)
  }

  /**
   * Sends an external signal to a suspended workflow.
   *
   * Used to resume workflows that are waiting for external events like manual approvals
   * or webhook callbacks.
   *
   * @param workflow - The workflow definition or builder.
   * @param workflowId - The unique identifier of the suspended workflow.
   * @param signalName - The name of the signal the workflow is waiting for.
   * @param payload - Optional data to pass along with the signal.
   * @returns The result of the workflow execution after receiving the signal.
   * @throws {FluxError} If the workflow is not found, not suspended, or waiting for a different signal.
   *
   * @example
   * ```typescript
   * await engine.signal(orderWorkflow, 'id-123', 'payment_received', { amount: 100 });
   * ```
   */
  async signal<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    workflowId: string,
    signalName: string,
    payload?: any
  ): Promise<FluxResult<TData>> {
    const definition = this.resolveDefinition(workflow)
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

    if (!execution || execution.status !== 'suspended') {
      throw new Errors.FluxError(
        'Workflow state invalid: no suspended step found',
        Errors.FluxErrorCode.STEP_NOT_FOUND
      )
    }
    if (execution.waitingFor !== signalName) {
      throw new Errors.FluxError(
        `Workflow waiting for signal "${execution.waitingFor}", received "${signalName}"`,
        Errors.FluxErrorCode.INVALID_STATE_TRANSITION
      )
    }

    execution = {
      ...execution,
      status: 'completed',
      completedAt: new Date(),
      output: payload,
    }

    ctx = updateWorkflowContext(ctx, {
      history: ctx.history.map((h, i) => (i === currentStepIndex ? execution : h)),
    })

    const stateMachine = new StateMachine()
    stateMachine.forceStatus('suspended')

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
      stateMachine,
      Date.now(),
      nextStepIndex,
      {
        resume: true,
        fromStep: nextStepIndex,
      }
    )
    return this.handleResult(definition, ctx, result)
  }

  /**
   * Retries a specific step in a failed or suspended workflow.
   *
   * This allows for targeted recovery of specific failures without necessarily
   * resuming from the very last saved state.
   *
   * @param workflow - The workflow definition or builder.
   * @param workflowId - The unique identifier of the workflow.
   * @param stepName - The name of the step to retry.
   * @returns The result of the execution after the retry, or null if the workflow is not found.
   * @throws {FluxError} If the workflow definition has changed or the step name is invalid.
   *
   * @example
   * ```typescript
   * await engine.retryStep(orderWorkflow, 'id-123', 'shipping');
   * ```
   */
  async retryStep<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    workflowId: string,
    stepName: string
  ): Promise<FluxResult<TData> | null> {
    const definition = this.resolveDefinition(workflow)
    const state = await this.storage.load(workflowId)
    if (!state) {
      return null
    }
    if (state.name !== definition.name) {
      throw Errors.workflowNameMismatch(definition.name, state.name)
    }
    if (state.history.length !== definition.steps.length) {
      throw Errors.workflowDefinitionChanged()
    }

    let ctx = this.contextManager.restore<TInput, TData>(
      state as unknown as WorkflowState<TInput, TData>
    )
    const stateMachine = new StateMachine()
    stateMachine.forceStatus('pending')

    const startIndex = this.resolveStartIndex(definition, stepName, ctx.currentStep)
    this.resetHistoryFrom(ctx, startIndex)
    ctx = updateWorkflowContext(ctx, { status: 'pending', currentStep: startIndex })

    ctx = await this.persist(ctx)

    const result = await this.executor.execute(
      definition,
      ctx,
      stateMachine,
      Date.now(),
      startIndex,
      {
        retry: true,
        fromStep: startIndex,
      }
    )
    return this.handleResult(definition, ctx, result)
  }

  /**
   * Retrieves the current state of a workflow instance from storage.
   *
   * @param workflowId - The unique identifier of the workflow.
   * @returns A promise resolving to the workflow state or null if not found.
   *
   * @example
   * ```typescript
   * const state = await engine.get('workflow-id-123');
   * console.log('Current status:', state?.status);
   * ```
   */
  async get<TInput = any, TData = any>(
    workflowId: string
  ): Promise<WorkflowState<TInput, TData> | null> {
    return this.storage.load(workflowId) as Promise<WorkflowState<TInput, TData> | null>
  }

  /**
   * Manually saves a workflow state to storage.
   *
   * Performs a version check to prevent concurrent modifications.
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
   *
   * Should be called before any execution if the storage requires setup.
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

  private resolveDefinition<TInput, TData>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>
  ): WorkflowDefinition<TInput, TData> {
    return workflow instanceof WorkflowBuilder ? workflow.build() : workflow
  }

  private resolveStartIndex<TInput, TData>(
    definition: WorkflowDefinition<TInput, TData>,
    fromStep: number | string | undefined,
    fallback: number
  ): number {
    if (typeof fromStep === 'number') {
      if (fromStep < 0 || fromStep >= definition.steps.length) {
        throw Errors.invalidStepIndex(fromStep)
      }
      return fromStep
    }
    if (typeof fromStep === 'string') {
      const index = definition.steps.findIndex((step) => step.name === fromStep)
      if (index === -1) {
        throw Errors.stepNotFound(fromStep)
      }
      return index
    }
    return Math.max(0, Math.min(fallback, definition.steps.length - 1))
  }

  private resetHistoryFrom<TInput, TData>(
    ctx: WorkflowContext<TInput, TData>,
    startIndex: number
  ): void {
    for (let i = startIndex; i < ctx.history.length; i++) {
      const entry = ctx.history[i]
      if (!entry) {
        continue
      }
      entry.status = 'pending'
      entry.startedAt = undefined
      entry.completedAt = undefined
      entry.duration = undefined
      entry.error = undefined
      entry.retries = 0
    }
  }

  private async handleResult<TInput, TData extends Record<string, any>>(
    definition: WorkflowDefinition<TInput, TData>,
    ctx: WorkflowContext<TInput, TData>,
    result: FluxResult<TData>
  ): Promise<FluxResult<TData>> {
    if (result.status === 'failed' && result.error) {
      const failedIndex = result.history.findIndex((h) => h.status === 'failed')
      if (failedIndex !== -1) {
        const restoredCtx = this.contextManager.restore({
          ...this.contextManager.toState(ctx),
          history: result.history,
          data: result.data,
          status: 'failed',
          version: result.version,
        })
        const rolledBackCtx = await this.rollbackManager.rollback(
          definition,
          restoredCtx,
          failedIndex,
          result.error
        )

        return {
          ...result,
          status: rolledBackCtx.status as any,
          history: rolledBackCtx.history,
          data: rolledBackCtx.data as TData,
        }
      }
    }

    return result
  }

  private async persist<TInput, TData extends Record<string, any>>(
    ctx: WorkflowContext<TInput, TData>
  ): Promise<WorkflowContext<TInput, TData>> {
    const state = this.contextManager.toState(ctx)
    const stored = await this.storage.load(state.id)
    if (stored && stored.version !== state.version) {
      throw new Errors.FluxError(
        'Concurrent modification detected',
        Errors.FluxErrorCode.CONCURRENT_MODIFICATION
      )
    }
    const nextVersion = state.version + 1
    await this.storage.save({ ...state, version: nextVersion })
    return updateWorkflowContext(ctx, { version: nextVersion })
  }
}
