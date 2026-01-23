import type { StepExecution, WorkflowContext, WorkflowState, WorkflowStatus } from '../types'

function generateId(): string {
  return crypto.randomUUID()
}

export class ContextManager {
  create<TInput, TData extends Record<string, any> = Record<string, any>>(
    name: string,
    input: TInput,
    stepCount: number
  ): WorkflowContext<TInput, TData> {
    const history: StepExecution[] = Array.from({ length: stepCount }, (_, _i) => ({
      name: '',
      status: 'pending',
      retries: 0,
    }))

    return {
      id: generateId(),
      name,
      input,
      data: {} as TData,
      status: 'pending',
      currentStep: 0,
      history,
      version: 1,
    }
  }

  restore<TInput, TData extends Record<string, any> = Record<string, any>>(
    state: WorkflowState<TInput, TData>
  ): WorkflowContext<TInput, TData> {
    return {
      id: state.id,
      name: state.name,
      input: state.input as TInput,
      data: { ...state.data } as unknown as TData,
      status: state.status,
      currentStep: state.currentStep,
      history: state.history.map((h) => ({ ...h })),
      version: state.version || 1,
    }
  }

  toState<TInput, TData extends Record<string, any>>(
    ctx: WorkflowContext<TInput, TData>
  ): WorkflowState<TInput, TData> {
    return {
      id: ctx.id,
      name: ctx.name,
      status: ctx.status,
      input: ctx.input,
      data: { ...ctx.data },
      currentStep: ctx.currentStep,
      history: ctx.history.map((h) => ({ ...h })),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: ctx.version,
    }
  }

  updateStatus<TInput, TData extends Record<string, any>>(
    ctx: WorkflowContext<TInput, TData>,
    status: WorkflowStatus
  ): WorkflowContext<TInput, TData> {
    return {
      ...ctx,
      status,
    }
  }

  advanceStep<TInput, TData extends Record<string, any>>(
    ctx: WorkflowContext<TInput, TData>
  ): WorkflowContext<TInput, TData> {
    return {
      ...ctx,
      currentStep: ctx.currentStep + 1,
    }
  }

  setStepName<TInput, TData extends Record<string, any>>(
    ctx: WorkflowContext<TInput, TData>,
    index: number,
    name: string
  ): WorkflowContext<TInput, TData> {
    if (!ctx.history[index]) {
      return ctx
    }
    const history = [...ctx.history]
    history[index] = { ...history[index], name }
    return {
      ...ctx,
      history,
    }
  }
}
