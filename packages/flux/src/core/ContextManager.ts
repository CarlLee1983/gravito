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
  create<TInput>(name: string, input: TInput, stepCount: number): WorkflowContext<TInput> {
    const history: StepExecution[] = Array.from({ length: stepCount }, (_, i) => ({
      name: '',
      status: 'pending',
      retries: 0,
    }))

    return {
      id: generateId(),
      name,
      input,
      data: {} as Record<string, unknown>,
      status: 'pending',
      currentStep: 0,
      history,
    }
  }

  /**
   * Restore context from saved state
   */
  restore<TInput>(state: WorkflowState): WorkflowContext<TInput> {
    return {
      id: state.id,
      name: state.name,
      input: state.input as TInput,
      data: { ...state.data },
      status: state.status,
      currentStep: state.currentStep,
      history: state.history.map((h) => ({ ...h })),
    }
  }

  /**
   * Convert context to serializable state
   */
  toState(ctx: WorkflowContext): WorkflowState {
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
    }
  }

  /**
   * Update context status (returns new context for immutability)
   */
  updateStatus(ctx: WorkflowContext, status: WorkflowStatus): WorkflowContext {
    return {
      ...ctx,
      status,
    }
  }

  /**
   * Advance to next step
   */
  advanceStep(ctx: WorkflowContext): WorkflowContext {
    return {
      ...ctx,
      currentStep: ctx.currentStep + 1,
    }
  }

  /**
   * Update step name in history
   */
  setStepName(ctx: WorkflowContext, index: number, name: string): void {
    if (ctx.history[index]) {
      ctx.history[index].name = name
    }
  }
}
