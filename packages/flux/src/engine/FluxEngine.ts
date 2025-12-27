/**
 * @fileoverview Flux Engine - Main workflow execution engine
 *
 * Orchestrates workflow execution with storage and event handling.
 *
 * @module @gravito/flux
 */

import { WorkflowBuilder } from '../builder/WorkflowBuilder'
import { ContextManager } from '../core/ContextManager'
import { StateMachine } from '../core/StateMachine'
import { StepExecutor } from '../core/StepExecutor'
import { MemoryStorage } from '../storage/MemoryStorage'
import type {
  FluxConfig,
  FluxResult,
  FluxTraceEvent,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowStorage,
} from '../types'

/**
 * Flux Engine
 *
 * Main workflow execution engine.
 *
 * @example
 * ```typescript
 * const engine = new FluxEngine({ storage: new MemoryStorage() })
 *
 * const workflow = createWorkflow('process-order')
 *   .input<{ orderId: string }>()
 *   .step('fetch', async (ctx) => { ... })
 *   .step('validate', async (ctx) => { ... })
 *   .commit('save', async (ctx) => { ... })
 *
 * const result = await engine.execute(workflow, { orderId: '123' })
 * ```
 */
export class FluxEngine {
  private storage: WorkflowStorage
  private executor: StepExecutor
  private contextManager: ContextManager
  private config: FluxConfig

  constructor(config: FluxConfig = {}) {
    this.config = config
    this.storage = config.storage ?? new MemoryStorage()
    this.executor = new StepExecutor({
      defaultRetries: config.defaultRetries,
      defaultTimeout: config.defaultTimeout,
      onRetry: async (step, ctx, error, attempt, maxRetries) => {
        await this.emitTrace({
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
    this.contextManager = new ContextManager()
  }

  /**
   * Execute a workflow with input data
   *
   * @param workflow - Workflow builder or definition
   * @param input - Input data for the workflow
   * @returns Execution result
   */
  async execute<TInput, TData = Record<string, unknown>>(
    workflow: WorkflowBuilder<TInput> | WorkflowDefinition<TInput>,
    input: TInput
  ): Promise<FluxResult<TData>> {
    const startTime = Date.now()
    const definition = this.resolveDefinition(workflow)

    // Validate input if validator provided
    if (definition.validateInput && !definition.validateInput(input)) {
      throw new Error(`Invalid input for workflow "${definition.name}"`)
    }

    // Create context
    const ctx = this.contextManager.create(
      definition.name,
      input,
      definition.steps.length
    ) as WorkflowContext<TInput>

    // Create state machine
    const stateMachine = new StateMachine()

    // Save initial state
    await this.storage.save(this.contextManager.toState(ctx))

    return this.runFrom(definition, ctx, stateMachine, startTime, 0)
  }

  /**
   * Resume a paused or failed workflow
   *
   * @param workflowId - Workflow instance ID
   * @returns Execution result or null if not found
   */
  async resume<TInput, TData = Record<string, unknown>>(
    workflow: WorkflowBuilder<TInput> | WorkflowDefinition<TInput>,
    workflowId: string,
    options?: { fromStep?: number | string }
  ): Promise<FluxResult<TData> | null> {
    const definition = this.resolveDefinition(workflow)
    const state = await this.storage.load(workflowId)
    if (!state) {
      return null
    }
    if (state.name !== definition.name) {
      throw new Error(`Workflow name mismatch: ${state.name} !== ${definition.name}`)
    }
    if (state.history.length !== definition.steps.length) {
      throw new Error('Workflow definition changed; resume is not safe')
    }

    const ctx = this.contextManager.restore<TInput>(state)
    const stateMachine = new StateMachine()
    stateMachine.forceStatus('pending')

    const startIndex = this.resolveStartIndex(definition, options?.fromStep, ctx.currentStep)
    this.resetHistoryFrom(ctx, startIndex)
    Object.assign(ctx, { status: 'pending', currentStep: startIndex })

    await this.storage.save(this.contextManager.toState(ctx))

    return this.runFrom(definition, ctx, stateMachine, Date.now(), startIndex, {
      resume: true,
      fromStep: startIndex,
    })
  }

  /**
   * Retry a specific step (replays from that step onward)
   */
  async retryStep<TInput, TData = Record<string, unknown>>(
    workflow: WorkflowBuilder<TInput> | WorkflowDefinition<TInput>,
    workflowId: string,
    stepName: string
  ): Promise<FluxResult<TData> | null> {
    const definition = this.resolveDefinition(workflow)
    const state = await this.storage.load(workflowId)
    if (!state) {
      return null
    }
    if (state.name !== definition.name) {
      throw new Error(`Workflow name mismatch: ${state.name} !== ${definition.name}`)
    }
    if (state.history.length !== definition.steps.length) {
      throw new Error('Workflow definition changed; retry is not safe')
    }

    const ctx = this.contextManager.restore<TInput>(state)
    const stateMachine = new StateMachine()
    stateMachine.forceStatus('pending')

    const startIndex = this.resolveStartIndex(definition, stepName, ctx.currentStep)
    this.resetHistoryFrom(ctx, startIndex)
    Object.assign(ctx, { status: 'pending', currentStep: startIndex })

    await this.storage.save(this.contextManager.toState(ctx))

    return this.runFrom(definition, ctx, stateMachine, Date.now(), startIndex, {
      retry: true,
      fromStep: startIndex,
    })
  }

  /**
   * Get workflow state by ID
   */
  async get(workflowId: string) {
    return this.storage.load(workflowId)
  }

  /**
   * List workflows
   */
  async list(filter?: Parameters<WorkflowStorage['list']>[0]) {
    return this.storage.list(filter)
  }

  /**
   * Initialize engine (init storage)
   */
  async init(): Promise<void> {
    await this.storage.init?.()
  }

  /**
   * Shutdown engine (cleanup)
   */
  async close(): Promise<void> {
    await this.storage.close?.()
  }

  private resolveDefinition<TInput>(
    workflow: WorkflowBuilder<TInput> | WorkflowDefinition<TInput>
  ): WorkflowDefinition<TInput> {
    return workflow instanceof WorkflowBuilder ? workflow.build() : workflow
  }

  private resolveStartIndex<TInput>(
    definition: WorkflowDefinition<TInput>,
    fromStep: number | string | undefined,
    fallback: number
  ): number {
    if (typeof fromStep === 'number') {
      if (fromStep < 0 || fromStep >= definition.steps.length) {
        throw new Error(`Invalid step index: ${fromStep}`)
      }
      return fromStep
    }
    if (typeof fromStep === 'string') {
      const index = definition.steps.findIndex((step) => step.name === fromStep)
      if (index === -1) {
        throw new Error(`Step not found: ${fromStep}`)
      }
      return index
    }
    return Math.max(0, Math.min(fallback, definition.steps.length - 1))
  }

  private resetHistoryFrom(ctx: WorkflowContext, startIndex: number): void {
    for (let i = startIndex; i < ctx.history.length; i++) {
      const entry = ctx.history[i]
      entry.status = 'pending'
      entry.startedAt = undefined
      entry.completedAt = undefined
      entry.duration = undefined
      entry.error = undefined
      entry.retries = 0
    }
  }

  private async runFrom<TInput, TData = Record<string, unknown>>(
    definition: WorkflowDefinition<TInput>,
    ctx: WorkflowContext<TInput>,
    stateMachine: StateMachine,
    startTime: number,
    startIndex: number,
    meta?: { resume?: boolean; retry?: boolean; fromStep?: number }
  ): Promise<FluxResult<TData>> {
    try {
      // Transition to running
      stateMachine.transition('running')
      Object.assign(ctx, { status: 'running' })
      await this.emitTrace({
        type: 'workflow:start',
        timestamp: Date.now(),
        workflowId: ctx.id,
        workflowName: ctx.name,
        status: ctx.status,
        meta,
      })

      // Execute steps
      for (let i = startIndex; i < definition.steps.length; i++) {
        const step = definition.steps[i]!
        const execution = ctx.history[i]!

        // Update step name
        this.contextManager.setStepName(ctx, i, step.name)
        Object.assign(ctx, { currentStep: i })

        // Emit step start event
        this.config.on?.stepStart?.(step.name, ctx)
        await this.emitTrace({
          type: 'step:start',
          timestamp: Date.now(),
          workflowId: ctx.id,
          workflowName: ctx.name,
          stepName: step.name,
          stepIndex: i,
          commit: Boolean(step.commit),
          retries: execution.retries,
          status: execution.status,
          meta,
        })

        // Execute step
        const result = await this.executor.execute(step, ctx, execution)

        if (result.success) {
          // Emit step complete event
          this.config.on?.stepComplete?.(step.name, ctx, result)
          if (execution.status === 'skipped') {
            await this.emitTrace({
              type: 'step:skipped',
              timestamp: Date.now(),
              workflowId: ctx.id,
              workflowName: ctx.name,
              stepName: step.name,
              stepIndex: i,
              commit: Boolean(step.commit),
              retries: execution.retries,
              duration: result.duration,
              status: execution.status,
              meta,
            })
          } else {
            await this.emitTrace({
              type: 'step:complete',
              timestamp: Date.now(),
              workflowId: ctx.id,
              workflowName: ctx.name,
              stepName: step.name,
              stepIndex: i,
              commit: Boolean(step.commit),
              retries: execution.retries,
              duration: result.duration,
              status: execution.status,
              meta,
            })
          }
        } else {
          // Emit step error event
          this.config.on?.stepError?.(step.name, ctx, result.error!)
          await this.emitTrace({
            type: 'step:error',
            timestamp: Date.now(),
            workflowId: ctx.id,
            workflowName: ctx.name,
            stepName: step.name,
            stepIndex: i,
            commit: Boolean(step.commit),
            retries: execution.retries,
            duration: result.duration,
            error: result.error?.message,
            status: execution.status,
            meta,
          })

          // Fail workflow
          stateMachine.transition('failed')
          Object.assign(ctx, { status: 'failed' })

          await this.storage.save({
            ...this.contextManager.toState(ctx),
            error: result.error?.message,
          })

          return {
            id: ctx.id,
            status: 'failed',
            data: ctx.data as TData,
            history: ctx.history,
            duration: Date.now() - startTime,
            error: result.error,
          }
        }

        // Save progress after each step
        await this.storage.save(this.contextManager.toState(ctx))
      }

      // Complete workflow
      stateMachine.transition('completed')
      Object.assign(ctx, { status: 'completed' })

      await this.storage.save({
        ...this.contextManager.toState(ctx),
        completedAt: new Date(),
      })

      // Emit workflow complete event
      this.config.on?.workflowComplete?.(ctx)
      await this.emitTrace({
        type: 'workflow:complete',
        timestamp: Date.now(),
        workflowId: ctx.id,
        workflowName: ctx.name,
        status: ctx.status,
        duration: Date.now() - startTime,
        meta,
      })

      return {
        id: ctx.id,
        status: 'completed',
        data: ctx.data as TData,
        history: ctx.history,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // Emit workflow error event
      this.config.on?.workflowError?.(ctx, err)
      await this.emitTrace({
        type: 'workflow:error',
        timestamp: Date.now(),
        workflowId: ctx.id,
        workflowName: ctx.name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: err.message,
        meta,
      })

      stateMachine.forceStatus('failed')
      Object.assign(ctx, { status: 'failed' })

      await this.storage.save({
        ...this.contextManager.toState(ctx),
        error: err.message,
      })

      return {
        id: ctx.id,
        status: 'failed',
        data: ctx.data as TData,
        history: ctx.history,
        duration: Date.now() - startTime,
        error: err,
      }
    }
  }

  private async emitTrace(event: FluxTraceEvent): Promise<void> {
    try {
      await this.config.trace?.emit(event)
    } catch {
      // Ignore trace failures to avoid breaking workflow execution
    }
  }
}
