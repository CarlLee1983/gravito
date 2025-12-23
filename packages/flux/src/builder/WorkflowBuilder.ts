/**
 * @fileoverview Workflow Builder - Fluent API for defining workflows
 *
 * Type-safe, chainable workflow definition.
 *
 * @module @gravito/flux/builder
 */

import type { StepDefinition, WorkflowContext, WorkflowDefinition } from '../types'

/**
 * Step options
 */
interface StepOptions {
  retries?: number
  timeout?: number
  when?: (ctx: WorkflowContext) => boolean
}

/**
 * Workflow Builder
 *
 * Provides fluent API for defining workflows with type inference.
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow('order-process')
 *   .input<{ orderId: string }>()
 *   .step('validate', async (ctx) => {
 *     ctx.data.order = await fetchOrder(ctx.input.orderId)
 *   })
 *   .step('process', async (ctx) => {
 *     await processOrder(ctx.data.order)
 *   })
 *   .commit('notify', async (ctx) => {
 *     await sendEmail(ctx.data.order.email)
 *   })
 * ```
 */
export class WorkflowBuilder<TInput = unknown> {
  private _name: string
  private _steps: StepDefinition[] = []
  private _validateInput?: (input: unknown) => input is TInput

  constructor(name: string) {
    this._name = name
  }

  /**
   * Define input type
   *
   * This method is used for TypeScript type inference.
   */
  input<T>(): WorkflowBuilder<T> {
    return this as unknown as WorkflowBuilder<T>
  }

  /**
   * Add input validator
   */
  validate(validator: (input: unknown) => input is TInput): this {
    this._validateInput = validator
    return this
  }

  /**
   * Add a step to the workflow
   */
  step(
    name: string,
    handler: (ctx: WorkflowContext<TInput>) => Promise<void> | void,
    options?: StepOptions
  ): this {
    this._steps.push({
      name,
      handler: handler as (ctx: WorkflowContext) => Promise<void> | void,
      retries: options?.retries,
      timeout: options?.timeout,
      when: options?.when as ((ctx: WorkflowContext) => boolean) | undefined,
      commit: false,
    })
    return this
  }

  /**
   * Add a commit step (always executes, even on replay)
   *
   * Commit steps are for side effects that should not be skipped,
   * such as database writes or external API calls.
   */
  commit(
    name: string,
    handler: (ctx: WorkflowContext<TInput>) => Promise<void> | void,
    options?: StepOptions
  ): this {
    this._steps.push({
      name,
      handler: handler as (ctx: WorkflowContext) => Promise<void> | void,
      retries: options?.retries,
      timeout: options?.timeout,
      when: options?.when as ((ctx: WorkflowContext) => boolean) | undefined,
      commit: true,
    })
    return this
  }

  /**
   * Build the workflow definition
   */
  build(): WorkflowDefinition<TInput> {
    if (this._steps.length === 0) {
      throw new Error(`Workflow "${this._name}" has no steps`)
    }

    return {
      name: this._name,
      steps: [...this._steps],
      validateInput: this._validateInput,
    }
  }

  /**
   * Get workflow name
   */
  get name(): string {
    return this._name
  }

  /**
   * Get step count
   */
  get stepCount(): number {
    return this._steps.length
  }
}

/**
 * Create a new workflow builder
 *
 * @param name - Unique workflow name
 * @returns WorkflowBuilder instance
 *
 * @example
 * ```typescript
 * const uploadFlow = createWorkflow('image-upload')
 *   .input<{ file: Buffer }>()
 *   .step('resize', async (ctx) => {
 *     ctx.data.resized = await sharp(ctx.input.file).resize(200).toBuffer()
 *   })
 *   .commit('save', async (ctx) => {
 *     await storage.put(ctx.data.resized)
 *   })
 * ```
 */
export function createWorkflow(name: string): WorkflowBuilder {
  return new WorkflowBuilder(name)
}
