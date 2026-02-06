import * as Errors from '../errors'
import type {
  StepDefinition,
  StepDescriptor,
  StepHandlerResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowDescriptor,
} from '../types'

/**
 * Configuration options for a workflow step.
 * Allows fine-tuning of execution behavior such as retries, timeouts, and conditional logic.
 */
export interface StepOptions<TInput = unknown, TData = Record<string, any>> {
  /** Maximum number of retry attempts on failure. */
  retries?: number
  /** Execution time limit in milliseconds. */
  timeout?: number
  /** Predicate to determine if the step should execute based on current context. */
  when?: (ctx: WorkflowContext<TInput, TData>) => boolean
  /** Logic to execute for rolling back changes if a subsequent step fails. */
  compensate?: (ctx: WorkflowContext<TInput, TData>) => Promise<void> | void
}

export interface ParallelStepConfig<TInput = unknown, TData = Record<string, any>> {
  name: string
  handler: (ctx: WorkflowContext<TInput, TData>) => StepHandlerResult
  options?: StepOptions<TInput, TData>
  /** Shorthand for options.compensate - rollback logic if subsequent steps fail */
  compensate?: (ctx: WorkflowContext<TInput, TData>) => Promise<void> | void
  /** Shorthand for options.retries */
  retries?: number
  /** Shorthand for options.timeout */
  timeout?: number
  /** Shorthand for options.when */
  when?: (ctx: WorkflowContext<TInput, TData>) => boolean
}

/**
 * A fluent API for defining workflows in a type-safe manner.
 * The builder pattern ensures that workflows are constructed with all necessary components
 * before being passed to the execution engine.
 *
 * @example
 * ```typescript
 * const flow = new WorkflowBuilder('order-process')
 *   .input<{ id: string }>()
 *   .step('validate', (ctx) => { ... })
 *   .build();
 * ```
 */
export class WorkflowBuilder<TInput = unknown, TData = Record<string, any>> {
  private _name: string
  private _version?: string
  private _steps: StepDefinition[] = []
  private _validateInput?: (input: unknown) => input is TInput
  private _parallelGroupCounter = 0

  /**
   * Initializes a new workflow builder with a unique name.
   * @param name - The identifier for this workflow definition.
   */
  constructor(name: string) {
    this._name = name
  }

  /**
   * Defines the expected input type for the workflow.
   * This is a type-only operation that enables compile-time safety for subsequent steps.
   * @returns A builder instance with the specified input type.
   */
  input<T>(): WorkflowBuilder<T, TData> {
    return this as unknown as WorkflowBuilder<T, TData>
  }

  /**
   * Defines the structure of the shared data object used across steps.
   * @returns A builder instance with the specified data type.
   */
  data<T extends Record<string, any>>(): WorkflowBuilder<TInput, T> {
    return this as unknown as WorkflowBuilder<TInput, T>
  }

  /**
   * Sets the semantic version of this workflow definition.
   * @param v - A semantic version string (e.g., "1.0.0", "2.1.0").
   * @returns The builder instance for chaining.
   */
  version(v: string): this {
    this._version = v
    return this
  }

  /**
   * Attaches a runtime validator for the workflow input.
   * @param validator - A type guard function to verify input integrity.
   * @returns The builder instance for chaining.
   */
  validate(validator: (input: unknown) => input is TInput): this {
    this._validateInput = validator
    return this
  }

  /**
   * Adds a standard processing step to the workflow.
   * Standard steps are subject to compensation if the workflow fails later.
   *
   * @param name - Unique name for the step.
   * @param handler - The business logic to execute.
   * @param options - Optional execution configuration.
   * @returns The builder instance for chaining.
   */
  step(
    name: string,
    handler: (ctx: WorkflowContext<TInput, TData>) => StepHandlerResult,
    options?: StepOptions<TInput, TData>
  ): this {
    this._steps.push({
      name,
      handler: handler as (ctx: WorkflowContext) => StepHandlerResult,
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
   * Adds multiple steps that execute in parallel.
   * All steps in a parallel group will run concurrently and must all succeed before proceeding.
   *
   * @param steps - Array of step configurations to execute in parallel.
   * @returns The builder instance for chaining.
   *
   * @example
   * ```typescript
   * workflow.stepParallel([
   *   { name: 'fetch-user', handler: async (ctx) => { ctx.data.user = await getUser() } },
   *   { name: 'fetch-orders', handler: async (ctx) => { ctx.data.orders = await getOrders() } },
   *   { name: 'fetch-profile', handler: async (ctx) => { ctx.data.profile = await getProfile() } }
   * ])
   * ```
   */
  stepParallel(steps: ParallelStepConfig<TInput, TData>[]): this {
    if (steps.length === 0) {
      return this
    }

    const groupId = `parallel-${this._parallelGroupCounter++}`

    for (const stepConfig of steps) {
      this._steps.push({
        name: stepConfig.name,
        handler: stepConfig.handler as (ctx: WorkflowContext) => StepHandlerResult,
        retries: stepConfig.retries ?? stepConfig.options?.retries,
        timeout: stepConfig.timeout ?? stepConfig.options?.timeout,
        when: (stepConfig.when ?? stepConfig.options?.when) as
          | ((ctx: WorkflowContext) => boolean)
          | undefined,
        compensate: (stepConfig.compensate ?? stepConfig.options?.compensate) as
          | ((ctx: WorkflowContext) => Promise<void> | void)
          | undefined,
        commit: false,
        parallelGroup: groupId,
      })
    }

    return this
  }

  /**
   * Adds a "commit" step that represents a permanent side-effect.
   * Commit steps are intended for operations that should not be rolled back
   * or re-executed during certain replay scenarios.
   *
   * @param name - Unique name for the step.
   * @param handler - The side-effect logic to execute.
   * @param options - Optional execution configuration (compensation is not allowed).
   * @returns The builder instance for chaining.
   */
  commit(
    name: string,
    handler: (ctx: WorkflowContext<TInput, TData>) => Promise<void> | void,
    options?: Omit<StepOptions<TInput, TData>, 'compensate'>
  ): this {
    this._steps.push({
      name,
      handler: handler as (ctx: WorkflowContext) => StepHandlerResult,
      retries: options?.retries,
      timeout: options?.timeout,
      when: options?.when as ((ctx: WorkflowContext) => boolean) | undefined,
      commit: true,
    })
    return this
  }

  /**
   * Finalizes the workflow definition.
   * @returns A complete workflow blueprint ready for execution.
   * @throws Error if the workflow has no steps defined.
   */
  build(): WorkflowDefinition<TInput, TData> {
    if (this._steps.length === 0) {
      throw Errors.emptyWorkflow(this._name)
    }

    return {
      name: this._name,
      version: this._version,
      steps: [...this._steps] as StepDefinition<TInput, TData>[],
      validateInput: this._validateInput,
    }
  }

  /**
   * Generates a structural description of the workflow for introspection.
   * @returns A descriptor containing step metadata.
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
      version: this._version,
      steps,
    }
  }

  /** The name of the workflow being built. */
  get name(): string {
    return this._name
  }

  /** The number of steps currently defined in the workflow. */
  get stepCount(): number {
    return this._steps.length
  }
}

/**
 * Factory function to initiate a new workflow definition.
 *
 * @param name - The unique name for the workflow.
 * @returns A new WorkflowBuilder instance.
 *
 * @example
 * ```typescript
 * const flow = createWorkflow('my-flow')
 *   .step('hello', () => console.log('world'))
 *   .build();
 * ```
 */
export function createWorkflow(name: string): WorkflowBuilder {
  return new WorkflowBuilder(name)
}
