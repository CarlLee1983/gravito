import type { StepExecution, WorkflowContext } from '../types'

/**
 * Guards against duplicate compensation execution.
 *
 * Ensures compensation actions are idempotent by checking execution history
 * before allowing re-execution. Prevents duplicate side effects when rollback
 * is retried after a partial failure.
 *
 * @example
 * ```typescript
 * const guard = new IdempotencyGuard();
 *
 * if (guard.canCompensate(ctx, 'payment-step')) {
 *   await compensate();
 *   guard.recordCompensation(ctx, 'payment-step');
 * }
 * ```
 */
export class IdempotencyGuard {
  /**
   * Checks if a step can be compensated based on its execution history.
   *
   * A step can be compensated if:
   * - It has completed successfully
   * - It has NOT already been compensated
   * - It is not currently being compensated
   *
   * @param ctx - The current workflow context.
   * @param stepName - The name of the step to check.
   * @returns True if the step can be safely compensated.
   *
   * @example
   * ```typescript
   * const guard = new IdempotencyGuard();
   *
   * if (guard.canCompensate(ctx, 'reserve-inventory')) {
   *   await inventoryService.release(ctx.data.reservationId);
   * }
   * ```
   */
  canCompensate<TInput, TData>(ctx: WorkflowContext<TInput, TData>, stepName: string): boolean {
    const execution = this.findExecution(ctx, stepName)

    if (!execution) {
      return false
    }

    return execution.status === 'completed'
  }

  /**
   * Checks if a step has already been compensated.
   *
   * @param ctx - The current workflow context.
   * @param stepName - The name of the step to check.
   * @returns True if the step has already been compensated.
   *
   * @example
   * ```typescript
   * if (guard.isCompensated(ctx, 'book-flight')) {
   *   console.log('Flight booking already cancelled');
   * }
   * ```
   */
  isCompensated<TInput, TData>(ctx: WorkflowContext<TInput, TData>, stepName: string): boolean {
    const execution = this.findExecution(ctx, stepName)
    return execution?.status === 'compensated'
  }

  /**
   * Checks if a step is currently being compensated.
   *
   * @param ctx - The current workflow context.
   * @param stepName - The name of the step to check.
   * @returns True if the step is currently in the compensating state.
   */
  isCompensating<TInput, TData>(ctx: WorkflowContext<TInput, TData>, stepName: string): boolean {
    const execution = this.findExecution(ctx, stepName)
    return execution?.status === 'compensating'
  }

  /**
   * Retrieves the compensation timestamp for a step.
   *
   * @param ctx - The current workflow context.
   * @param stepName - The name of the step.
   * @returns The compensation timestamp if available, otherwise undefined.
   */
  getCompensationTimestamp<TInput, TData>(
    ctx: WorkflowContext<TInput, TData>,
    stepName: string
  ): Date | undefined {
    const execution = this.findExecution(ctx, stepName)
    return execution?.compensatedAt
  }

  /**
   * Counts how many times compensation has been attempted for a step.
   *
   * This is useful for implementing retry limits or circuit breakers.
   *
   * @param ctx - The current workflow context.
   * @param stepName - The name of the step.
   * @returns The number of compensation attempts (0 if never attempted).
   */
  getCompensationAttempts<TInput, TData>(
    ctx: WorkflowContext<TInput, TData>,
    stepName: string
  ): number {
    const executions = ctx.history.filter((h) => h.name === stepName)

    return executions.filter((e) => e.status === 'compensated' || e.status === 'compensating')
      .length
  }

  /**
   * Finds the most recent execution record for a given step.
   *
   * @param ctx - The current workflow context.
   * @param stepName - The name of the step to find.
   * @returns The step execution record, or undefined if not found.
   * @private
   */
  private findExecution<TInput, TData>(
    ctx: WorkflowContext<TInput, TData>,
    stepName: string
  ): StepExecution | undefined {
    for (let i = ctx.history.length - 1; i >= 0; i--) {
      if (ctx.history[i].name === stepName) {
        return ctx.history[i]
      }
    }
    return undefined
  }

  /**
   * Verifies that all completed steps have been compensated.
   *
   * Used to ensure rollback has fully completed.
   *
   * @param ctx - The current workflow context.
   * @param stepNames - Array of step names that should be compensated.
   * @returns True if all specified steps are compensated.
   *
   * @example
   * ```typescript
   * const guard = new IdempotencyGuard();
   * const completedSteps = ['reserve', 'charge', 'notify'];
   *
   * if (guard.allCompensated(ctx, completedSteps)) {
   *   console.log('Rollback complete');
   * }
   * ```
   */
  allCompensated<TInput, TData>(ctx: WorkflowContext<TInput, TData>, stepNames: string[]): boolean {
    return stepNames.every((name) => this.isCompensated(ctx, name))
  }

  /**
   * Finds all steps that need compensation but haven't been compensated yet.
   *
   * @param ctx - The current workflow context.
   * @param stepNames - Array of step names to check.
   * @returns Array of step names that still need compensation.
   *
   * @example
   * ```typescript
   * const guard = new IdempotencyGuard();
   * const pending = guard.getPendingCompensations(ctx, ['step1', 'step2', 'step3']);
   * console.log(`Still need to compensate: ${pending.join(', ')}`);
   * ```
   */
  getPendingCompensations<TInput, TData>(
    ctx: WorkflowContext<TInput, TData>,
    stepNames: string[]
  ): string[] {
    return stepNames.filter((name) => {
      const execution = this.findExecution(ctx, name)
      return execution?.status === 'completed'
    })
  }
}
