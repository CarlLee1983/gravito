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
    const definition = workflow instanceof WorkflowBuilder ? workflow.build() : workflow

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

    try {
      // Transition to running
      stateMachine.transition('running')
      Object.assign(ctx, { status: 'running' })

      // Execute steps
      for (let i = 0; i < definition.steps.length; i++) {
        const step = definition.steps[i]!
        const execution = ctx.history[i]!

        // Update step name
        this.contextManager.setStepName(ctx, i, step.name)
        Object.assign(ctx, { currentStep: i })

        // Emit step start event
        this.config.on?.stepStart?.(step.name, ctx)

        // Execute step
        const result = await this.executor.execute(step, ctx, execution)

        if (result.success) {
          // Emit step complete event
          this.config.on?.stepComplete?.(step.name, ctx, result)
        } else {
          // Emit step error event
          this.config.on?.stepError?.(step.name, ctx, result.error!)

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

  /**
   * Resume a paused or failed workflow
   *
   * @param workflowId - Workflow instance ID
   * @returns Execution result or null if not found
   */
  async resume<TData = Record<string, unknown>>(
    workflowId: string
  ): Promise<FluxResult<TData> | null> {
    const state = await this.storage.load(workflowId)
    if (!state) return null

    // TODO: Implement resume logic
    throw new Error('Resume not yet implemented')
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
}
