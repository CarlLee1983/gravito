/**
 * @fileoverview Context Manager for workflow execution
 *
 * Manages workflow context lifecycle and state snapshots.
 *
 * @module @gravito/flux/core
 */

import type { StepExecution, WorkflowContext, WorkflowState, WorkflowStatus } from '../types'

/**
 * Generate unique ID using crypto.randomUUID (Web Standard)
 */
function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Context Manager
 *
 * Creates and manages workflow execution contexts.
 */
export class ContextManager {
  /**
   * Create a new workflow context
   */
  create<TInput, TData = any>(
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
    }
  }

  /**
   * Restore context from saved state
   */
  restore<TInput, TData = any>(
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
    }
  }

  /**
   * Convert context to serializable state
   */
  toState<TInput, TData>(ctx: WorkflowContext<TInput, TData>): WorkflowState<TInput, TData> {
    return {
      id: ctx.id,
      name: ctx.name,
      status: ctx.status,
      input: ctx.input,
      data: { ...(ctx.data as any) },
      currentStep: ctx.currentStep,
      history: ctx.history.map((h) => ({ ...h })),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * Update context status (returns new context for immutability)
   */
  updateStatus<TInput, TData>(
    ctx: WorkflowContext<TInput, TData>,
    status: WorkflowStatus
  ): WorkflowContext<TInput, TData> {
    return {
      ...ctx,
      status,
    }
  }

  /**
   * Advance to next step
   */
  advanceStep<TInput, TData>(ctx: WorkflowContext<TInput, TData>): WorkflowContext<TInput, TData> {
    return {
      ...ctx,
      currentStep: ctx.currentStep + 1,
    }
  }

  /**
   * Update step name in history
   */
  setStepName<TInput, TData>(
    ctx: WorkflowContext<TInput, TData>,
    index: number,
    name: string
  ): void {
    if (ctx.history[index]) {
      ctx.history[index].name = name
    }
  }
}
