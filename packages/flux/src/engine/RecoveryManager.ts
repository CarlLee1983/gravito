import * as Errors from '../errors'
import type { WorkflowContext } from '../types'

/**
 * Callback for handling recovery needed events.
 */
export type RecoveryCallback<TInput = unknown, TData = Record<string, any>> = (
  ctx: WorkflowContext<TInput, TData>,
  stepName: string,
  error: Error
) => Promise<void> | void

/**
 * Recovery action types for manual intervention.
 */
export type RecoveryAction =
  | { type: 'retry'; maxAttempts?: number }
  | { type: 'skip' }
  | { type: 'manual'; handler: () => Promise<void> }
  | { type: 'abort' }

/**
 * Manages recovery from failed compensation actions through human intervention.
 *
 * When automatic retry fails, this manager allows workflows to wait for
 * manual recovery actions before proceeding with rollback.
 *
 * @example
 * ```typescript
 * const manager = new RecoveryManager();
 *
 * manager.onRecoveryNeeded(async (ctx, stepName, error) => {
 *   await notificationService.alert(
 *     'CRITICAL: Manual recovery needed',
 *     { workflow: ctx.id, step: stepName, error: error.message }
 *   );
 * });
 *
 * manager.registerAction('refund-payment', {
 *   type: 'manual',
 *   handler: async () => {
 *     await finance.manualRefund(ctx.data.transactionId);
 *   }
 * });
 * ```
 */
export class RecoveryManager<TInput = unknown, TData = Record<string, any>> {
  private recoveryCallbacks: RecoveryCallback<TInput, TData>[] = []
  private actions: Map<string, RecoveryAction> = new Map()
  private pendingRecoveries: Map<string, { stepName: string; error: Error }> = new Map()

  /**
   * Registers a callback to be invoked when recovery is needed.
   *
   * @param callback - Function to call when a recovery event occurs.
   *
   * @example
   * ```typescript
   * manager.onRecoveryNeeded(async (ctx, stepName, error) => {
   *   await slack.send(`#alerts`, `Workflow ${ctx.id} needs recovery at ${stepName}`);
   * });
   * ```
   */
  onRecoveryNeeded(callback: RecoveryCallback<TInput, TData>): void {
    this.recoveryCallbacks.push(callback)
  }

  /**
   * Emits a recovery needed event.
   *
   * @param ctx - The workflow context.
   * @param stepName - The step that failed compensation.
   * @param error - The error that occurred.
   */
  async notifyRecoveryNeeded(
    ctx: WorkflowContext<TInput, TData>,
    stepName: string,
    error: Error
  ): Promise<void> {
    this.pendingRecoveries.set(ctx.id, { stepName, error })

    for (const callback of this.recoveryCallbacks) {
      await callback(ctx, stepName, error)
    }
  }

  /**
   * Registers a recovery action for a specific step.
   *
   * @param stepName - The step name to associate the action with.
   * @param action - The recovery action to perform.
   *
   * @example
   * ```typescript
   * manager.registerAction('book-flight', {
   *   type: 'retry',
   *   maxAttempts: 5
   * });
   *
   * manager.registerAction('charge-card', {
   *   type: 'manual',
   *   handler: async () => {
   *     await accountingSystem.manualRefund(transactionId);
   *   }
   * });
   * ```
   */
  registerAction(stepName: string, action: RecoveryAction): void {
    this.actions.set(stepName, action)
  }

  /**
   * Gets the registered recovery action for a step.
   *
   * @param stepName - The step name.
   * @returns The recovery action if registered, otherwise undefined.
   */
  getAction(stepName: string): RecoveryAction | undefined {
    return this.actions.get(stepName)
  }

  /**
   * Checks if a workflow has a pending recovery.
   *
   * @param workflowId - The workflow ID.
   * @returns True if recovery is pending.
   */
  hasPendingRecovery(workflowId: string): boolean {
    return this.pendingRecoveries.has(workflowId)
  }

  /**
   * Gets the pending recovery details for a workflow.
   *
   * @param workflowId - The workflow ID.
   * @returns The pending recovery details if any.
   */
  getPendingRecovery(workflowId: string): { stepName: string; error: Error } | undefined {
    return this.pendingRecoveries.get(workflowId)
  }

  /**
   * Marks a recovery as resolved.
   *
   * @param workflowId - The workflow ID.
   */
  resolveRecovery(workflowId: string): void {
    this.pendingRecoveries.delete(workflowId)
  }

  /**
   * Executes the registered recovery action for a step.
   *
   * @param stepName - The step name.
   * @returns The recovery action result.
   *
   * @example
   * ```typescript
   * const action = manager.getAction('failed-step');
   * if (action && action.type === 'manual') {
   *   await manager.executeRecovery('failed-step');
   * }
   * ```
   */
  async executeRecovery(stepName: string): Promise<void> {
    const action = this.actions.get(stepName)

    if (!action) {
      throw Errors.noRecoveryAction(stepName)
    }

    if (action.type === 'manual') {
      await action.handler()
    }
  }

  /**
   * Clears all registered actions.
   */
  clearActions(): void {
    this.actions.clear()
  }

  /**
   * Clears all recovery callbacks.
   */
  clearCallbacks(): void {
    this.recoveryCallbacks = []
  }

  /**
   * Gets all pending recoveries.
   *
   * @returns A map of workflow IDs to pending recovery details.
   */
  getAllPendingRecoveries(): Map<string, { stepName: string; error: Error }> {
    return new Map(this.pendingRecoveries)
  }

  /**
   * Clears all pending recoveries.
   */
  clearPendingRecoveries(): void {
    this.pendingRecoveries.clear()
  }

  /**
   * Gets the count of registered callbacks.
   * @internal For testing purposes.
   */
  getCallbackCount(): number {
    return this.recoveryCallbacks.length
  }
}
