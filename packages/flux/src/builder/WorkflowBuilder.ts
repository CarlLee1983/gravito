import type {
  FluxWaitResult,
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
  private _steps: StepDefinition[] = []
  private _validateInput?: (input: unknown) => input is TInput

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
      throw new Error(`Workflow "${this._name}" has no steps`)
    }

    return {
      name: this._name,
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
