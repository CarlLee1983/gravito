import type {
  FluxWaitResult,
  StepDefinition,
  StepDescriptor,
  StepHandlerResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowDescriptor,
} from '../types'

export interface StepOptions<TInput = unknown, TData = Record<string, any>> {
  retries?: number
  timeout?: number
  when?: (ctx: WorkflowContext<TInput, TData>) => boolean
  compensate?: (ctx: WorkflowContext<TInput, TData>) => Promise<void> | void
}

export class WorkflowBuilder<TInput = unknown, TData = Record<string, any>> {
  private _name: string
  private _steps: StepDefinition[] = []
  private _validateInput?: (input: unknown) => input is TInput

  constructor(name: string) {
    this._name = name
  }

  input<T>(): WorkflowBuilder<T, TData> {
    return this as unknown as WorkflowBuilder<T, TData>
  }

  data<T extends Record<string, any>>(): WorkflowBuilder<TInput, T> {
    return this as unknown as WorkflowBuilder<TInput, T>
  }

  validate(validator: (input: unknown) => input is TInput): this {
    this._validateInput = validator
    return this
  }

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

  get name(): string {
    return this._name
  }

  get stepCount(): number {
    return this._steps.length
  }
}

export function createWorkflow(name: string): WorkflowBuilder {
  return new WorkflowBuilder(name)
}
