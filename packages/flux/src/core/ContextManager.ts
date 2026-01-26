import type { StepExecution, WorkflowContext, WorkflowState, WorkflowStatus } from '../types'

/**
 * Generates a unique identifier for workflow instances.
 *
 * @returns A cryptographically secure UUID string.
 */
function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Orchestrates the lifecycle and state transformations of a workflow context.
 *
 * The ContextManager is responsible for initializing new contexts, restoring them from
 * persisted states, and performing immutable updates during execution.
 *
 * @example
 * ```typescript
 * const manager = new ContextManager();
 * const ctx = manager.create('order-flow', { id: '123' }, 5);
 * ```
 */
export class ContextManager {
  /**
   * Initializes a fresh workflow context with a pending status and empty history.
   *
   * @param name - The human-readable identifier for the workflow type.
   * @param input - The initial data required to start the workflow.
   * @param stepCount - Total number of steps defined in the workflow for history pre-allocation.
   * @returns A new WorkflowContext instance.
   *
   * @example
   * ```typescript
   * const ctx = manager.create('signup', { email: 'user@example.com' }, 3);
   * ```
   */
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

  /**
   * Reconstructs a workflow context from a previously persisted state.
   *
   * Used for resuming suspended workflows or replaying failed ones from a specific point.
   *
   * @param state - The persisted state object.
   * @returns A hydrated WorkflowContext ready for execution.
   *
   * @example
   * ```typescript
   * const state = await storage.load(id);
   * const ctx = manager.restore(state);
   * ```
   */
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

  /**
   * Converts a runtime context into a serializable state for persistence.
   *
   * Captures the current progress, data, and execution history.
   *
   * @param ctx - The active workflow context.
   * @returns A serializable WorkflowState object.
   *
   * @example
   * ```typescript
   * const state = manager.toState(ctx);
   * await storage.save(state);
   * ```
   */
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

  /**
   * Updates the overall status of the workflow.
   *
   * @param ctx - The current context.
   * @param status - The new status to apply.
   * @returns A new context instance with the updated status.
   */
  updateStatus<TInput, TData extends Record<string, any>>(
    ctx: WorkflowContext<TInput, TData>,
    status: WorkflowStatus
  ): WorkflowContext<TInput, TData> {
    return {
      ...ctx,
      status,
    }
  }

  /**
   * Increments the current step pointer.
   *
   * @param ctx - The current context.
   * @returns A new context instance pointing to the next step.
   */
  advanceStep<TInput, TData extends Record<string, any>>(
    ctx: WorkflowContext<TInput, TData>
  ): WorkflowContext<TInput, TData> {
    return {
      ...ctx,
      currentStep: ctx.currentStep + 1,
    }
  }

  /**
   * Assigns a name to a specific step in the execution history.
   *
   * Useful for tracking which step is currently being executed or has been completed.
   *
   * @param ctx - The current context.
   * @param index - The index of the step in the history array.
   * @param name - The name to assign to the step.
   * @returns A new context instance with the updated history.
   */
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
