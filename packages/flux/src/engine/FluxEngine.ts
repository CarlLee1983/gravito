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
  WorkflowState,
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
  async execute<TInput, TData = any>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    input: TInput
  ): Promise<FluxResult<TData>> {
    const startTime = Date.now()
    const definition = this.resolveDefinition(workflow)

    // Validate input if validator provided
    if (definition.validateInput && !definition.validateInput(input)) {
      throw new Error(`Invalid input for workflow "${definition.name}"`)
    }

    // Create context
    const ctx = this.contextManager.create<TInput, TData>(
      definition.name,
      input,
      definition.steps.length
    ) as WorkflowContext<TInput, TData>

    // Create state machine
    const stateMachine = new StateMachine()

    // Save initial state
    await this.storage.save(this.contextManager.toState<TInput, TData>(ctx))

    return this.runFrom(definition, ctx, stateMachine, startTime, 0)
  }

  /**
   * Resume a paused or failed workflow
   *
   * @param workflowId - Workflow instance ID
   * @returns Execution result or null if not found
   */
  async resume<TInput, TData = any>(
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
      throw new Error(`Workflow name mismatch: ${state.name} !== ${definition.name}`)
    }
    if (state.history.length !== definition.steps.length) {
      throw new Error('Workflow definition changed; resume is not safe')
    }

    const ctx = this.contextManager.restore<TInput, TData>(state)
    const stateMachine = new StateMachine()
    stateMachine.forceStatus('pending')

    const startIndex = this.resolveStartIndex(definition, options?.fromStep, ctx.currentStep)
    this.resetHistoryFrom(ctx, startIndex)
    Object.assign(ctx, { status: 'pending', currentStep: startIndex })

    await this.storage.save(this.contextManager.toState<TInput, TData>(ctx))

    return this.runFrom(definition, ctx, stateMachine, Date.now(), startIndex, {
      resume: true,
      fromStep: startIndex,
    })
  }

  /**
   * Send a signal to a suspended workflow
   */
  async signal<TInput, TData = any>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    workflowId: string,
    signalName: string,
    payload?: any
  ): Promise<FluxResult<TData>> {
    const definition = this.resolveDefinition(workflow)
    const state = await this.storage.load(workflowId)
    if (!state) {
      throw new Error('Workflow not found')
    }
    if (state.status !== 'suspended') {
      throw new Error(`Workflow is not suspended (status: ${state.status})`)
    }

    const ctx = this.contextManager.restore<TInput, TData>(state)
    const currentStep = ctx.history[ctx.currentStep]

    if (!currentStep || currentStep.status !== 'suspended') {
      throw new Error('Workflow state invalid: no suspended step found')
    }
    if (currentStep.waitingFor !== signalName) {
      throw new Error(
        `Workflow waiting for signal "${currentStep.waitingFor}", received "${signalName}"`
      )
    }

    // Complete the suspended step
    currentStep.status = 'completed'
    currentStep.completedAt = new Date()
    currentStep.output = payload
    // If payload contains data, we might want to merge it?
    // For now, allow next step to access it via history or we need a cleaner way.
    // Let's assume user grabs it from history for now or we build a helper later.

    const stateMachine = new StateMachine()
    stateMachine.forceStatus('suspended')
    // ctx status will be updated to 'running' in runFrom

    await this.emitTrace({
      type: 'signal:received',
      timestamp: Date.now(),
      workflowId: ctx.id,
      workflowName: ctx.name,
      status: 'suspended',
      input: payload,
    })

    // Resume from NEXT step
    const nextStepIndex = ctx.currentStep + 1

    return this.runFrom(definition, ctx, stateMachine, Date.now(), nextStepIndex, {
      resume: true,
      fromStep: nextStepIndex,
    })
  }

  /**
   * Retry a specific step (replays from that step onward)
   */
  async retryStep<TInput, TData = any>(
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
      throw new Error(`Workflow name mismatch: ${state.name} !== ${definition.name}`)
    }
    if (state.history.length !== definition.steps.length) {
      throw new Error('Workflow definition changed; retry is not safe')
    }

    const ctx = this.contextManager.restore<TInput, TData>(state)
    const stateMachine = new StateMachine()
    stateMachine.forceStatus('pending')

    const startIndex = this.resolveStartIndex(definition, stepName, ctx.currentStep)
    this.resetHistoryFrom(ctx, startIndex)
    Object.assign(ctx, { status: 'pending', currentStep: startIndex })

    await this.storage.save(this.contextManager.toState<TInput, TData>(ctx))

    return this.runFrom(definition, ctx, stateMachine, Date.now(), startIndex, {
      retry: true,
      fromStep: startIndex,
    })
  }

  /**
   * Get workflow state by ID
   */
  async get<TInput = any, TData = any>(
    workflowId: string
  ): Promise<WorkflowState<TInput, TData> | null> {
    return this.storage.load(workflowId) as Promise<WorkflowState<TInput, TData> | null>
  }

  /**
   * Save workflow state manually (e.g., for external updates)
   */
  async saveState<TInput, TData>(state: WorkflowState<TInput, TData>): Promise<void> {
    return this.storage.save(state)
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

  /**
   * Rollback workflow by executing compensation handlers in reverse order
   */
  private async rollback<TInput, TData>(
    definition: WorkflowDefinition<TInput, TData>,
    ctx: WorkflowContext<TInput, TData>,
    failedAtIndex: number,
    originalError: Error
  ): Promise<void> {
    Object.assign(ctx, { status: 'rolling_back' })

    await this.emitTrace({
      type: 'workflow:rollback_start',
      timestamp: Date.now(),
      workflowId: ctx.id,
      workflowName: ctx.name,
      status: 'rolling_back',
      error: originalError.message,
    })

    let compensatedCount = 0

    // Iterate backwards from the step BEFORE the failed one
    for (let i = failedAtIndex - 1; i >= 0; i--) {
      const step = definition.steps[i]
      const execution = ctx.history[i]

      // Only compensate completed steps with compensation handler
      if (!step || !step.compensate || !execution || execution.status !== 'completed') {
        continue
      }

      try {
        execution.status = 'compensating'
        await this.storage.save(this.contextManager.toState<TInput, TData>(ctx))

        await step.compensate(ctx)

        execution.status = 'compensated'
        execution.compensatedAt = new Date()
        compensatedCount++

        await this.emitTrace({
          type: 'step:compensate',
          timestamp: Date.now(),
          workflowId: ctx.id,
          workflowName: ctx.name,
          stepName: step.name,
          stepIndex: i,
          status: 'compensated',
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        // Compensation failed - this is bad. Mark workflow as failed (not rolled_back)
        Object.assign(ctx, { status: 'failed' })

        await this.emitTrace({
          type: 'workflow:error',
          timestamp: Date.now(),
          workflowId: ctx.id,
          workflowName: ctx.name,
          status: 'failed',
          error: `Compensation failed at step "${step.name}": ${error.message}`,
        })
        return // Stop rollback
      }

      await this.storage.save(this.contextManager.toState<TInput, TData>(ctx))
    }

    if (compensatedCount > 0) {
      Object.assign(ctx, { status: 'rolled_back' })
      await this.emitTrace({
        type: 'workflow:rollback_complete',
        timestamp: Date.now(),
        workflowId: ctx.id,
        workflowName: ctx.name,
        status: 'rolled_back',
      })
    } else {
      // No compensation occurred, revert to failed status
      Object.assign(ctx, { status: 'failed' })
    }
  }

  private async runFrom<TInput, TData = any>(
    definition: WorkflowDefinition<TInput, TData>,
    ctx: WorkflowContext<TInput, TData>,
    stateMachine: StateMachine,
    startTime: number,
    startIndex: number,
    meta?: { resume?: boolean; retry?: boolean; fromStep?: number }
  ): Promise<FluxResult<TData>> {
    try {
      // Transition to running
      stateMachine.transition('running')
      Object.assign(ctx, { status: 'running' })
      if (!meta?.resume) {
        await this.emitTrace({
          type: 'workflow:start',
          timestamp: Date.now(),
          workflowId: ctx.id,
          workflowName: ctx.name,
          status: ctx.status,
          input: ctx.input,
          meta,
        })
      }

      // Execute steps
      for (let i = startIndex; i < definition.steps.length; i++) {
        const step = definition.steps[i]!
        const execution = ctx.history[i]!

        // Update step name
        this.contextManager.setStepName(ctx, i, step.name)
        Object.assign(ctx, { currentStep: i })

        // Emit step start event
        this.config.on?.stepStart?.(step.name, ctx as any)
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
          if (result.suspended) {
            // Handle suspension
            stateMachine.transition('suspended')
            Object.assign(ctx, { status: 'suspended' })

            await this.emitTrace({
              type: 'step:suspend',
              timestamp: Date.now(),
              workflowId: ctx.id,
              workflowName: ctx.name,
              stepName: step.name,
              stepIndex: i,
              meta: { signal: result.waitingFor },
            })

            await this.storage.save(this.contextManager.toState<TInput, TData>(ctx))

            return {
              id: ctx.id,
              status: 'suspended',
              data: ctx.data as TData,
              history: ctx.history,
              duration: Date.now() - startTime,
            }
          }

          // Emit step complete event
          this.config.on?.stepComplete?.(step.name, ctx as any, result)
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
          this.config.on?.stepError?.(step.name, ctx as any, result.error!)
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

          // Fail workflow with potential rollback
          await this.rollback<TInput, TData>(definition, ctx, i, result.error!)

          const finalStatus = ctx.status
          stateMachine.forceStatus(finalStatus)

          await this.storage.save({
            ...this.contextManager.toState<TInput, TData>(ctx),
            error: result.error?.message,
          })

          return {
            id: ctx.id,
            status: finalStatus,
            data: ctx.data as TData,
            history: ctx.history,
            duration: Date.now() - startTime,
            error: result.error,
          }
        }

        // Save progress after each step
        await this.storage.save(this.contextManager.toState<TInput, TData>(ctx))
      }

      // Complete workflow
      stateMachine.transition('completed')
      Object.assign(ctx, { status: 'completed' })

      await this.storage.save({
        ...this.contextManager.toState<TInput, TData>(ctx),
        completedAt: new Date(),
      })

      // Emit workflow complete event
      this.config.on?.workflowComplete?.(ctx as any)
      await this.emitTrace({
        type: 'workflow:complete',
        timestamp: Date.now(),
        workflowId: ctx.id,
        workflowName: ctx.name,
        status: ctx.status,
        duration: Date.now() - startTime,
        data: ctx.data as Record<string, unknown>,
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
      this.config.on?.workflowError?.(ctx as any, err)
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
        ...this.contextManager.toState<TInput, TData>(ctx),
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
