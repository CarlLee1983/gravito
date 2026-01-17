/**
 * @fileoverview Workflow Builder - Fluent API for defining workflows
 *
 * Type-safe, chainable workflow definition.
 *
 * @module @gravito/flux/builder
 */

import type {
  FluxWaitResult,
  StepDefinition,
  StepDescriptor,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowDescriptor,
} from '../types'

/**
 * Options for configuring a single step in a workflow.
 * @public
 */
export interface StepOptions<TInput = any, TData = any> {
  /** Maximum number of automatic retries on failure (default: 0) */
  retries?: number
  /** Maximum execution time in milliseconds before timeout error */
  timeout?: number
  /** Predicate to determine if the step should be executed or skipped */
  when?: (ctx: WorkflowContext<TInput, TData>) => boolean
  /** Logic to undo the effects of this step if a later step fails */
  compensate?: (ctx: WorkflowContext<TInput, TData>) => Promise<void> | void
}

/**
 * WorkflowBuilder provides a fluent, type-safe API for defining sequential logic.
 *
 * @example
 * ```typescript
 * const myFlow = createWorkflow('process-order')
 *   .input<{ orderId: string }>()
 *   .step('validate', async (ctx) => { ... })
 *   .step('charge', async (ctx) => { ... }, { compensate: async (ctx) => { ... } })
 *   .commit('ship', async (ctx) => { ... });
 * ```
 * @public
 */
export class WorkflowBuilder<TInput = unknown, TData = Record<string, unknown>> {
  drum: any = null; // No!
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
  input<T>(): WorkflowBuilder<T, TData> {
    return this as unknown as WorkflowBuilder<T, TData>
  }

  /**
   * Define workflow data (state) type
   *
   * This method is used for TypeScript type inference.
   */
  data<T>(): WorkflowBuilder<TInput, T> {
    return this as unknown as WorkflowBuilder<TInput, T>
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
    handler: (
      ctx: WorkflowContext<TInput, TData>
    ) => void | Promise<void | undefined | FluxWaitResult> | undefined | FluxWaitResult,
    options?: StepOptions<TInput, TData>
  ): this {
    this._steps.push({
      name,
      handler: handler as (
        ctx: WorkflowContext
      ) => void | Promise<void | undefined | FluxWaitResult> | undefined | FluxWaitResult,
      retries: options?.retries,
      timeout: options?.timeout,
      when: options?.when as ((ctx: WorkflowContext) => boolean) | undefined,
      compensate: options?.compensate as
        | ((ctx: WorkflowContext) => Promise<void> | void)
        | undefined,
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
    handler: (ctx: WorkflowContext<TInput, TData>) => Promise<void> | void,
    options?: Omit<StepOptions<TInput, TData>, 'compensate'>
  ): this {
    this._steps.push({
      name,
      handler: handler as unknown as StepDefinition['handler'],
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
  build(): WorkflowDefinition<TInput, TData> {
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
   * Describe workflow (serializable metadata)
   */
  describe(): WorkflowDescriptor {
    const steps: StepDescriptor[] = this._steps.map((step) => ({
      name: step.name,
      commit: Boolean(step.commit),
      retries: step.retries,
      timeout: step.timeout,
      hasCondition: Boolean(step.when),
    }))

    return {
      name: this._name,
      steps,
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
