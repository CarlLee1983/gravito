import type { WorkflowContext } from '../types'

/**
 * Pure function to update the workflow context.
 *
 * This utility ensures that context updates are performed immutably,
 * which is critical for maintaining consistent state across the engine.
 *
 * @param ctx - The current workflow context to update.
 * @param updates - The partial updates to apply to the context.
 * @returns A new workflow context instance with the updates applied.
 *
 * @example
 * ```typescript
 * const nextCtx = updateWorkflowContext(ctx, { status: 'completed' });
 * ```
 */
export function updateWorkflowContext<TInput, TData extends Record<string, any>>(
  ctx: WorkflowContext<TInput, TData>,
  updates: Partial<WorkflowContext<TInput, TData>>
): WorkflowContext<TInput, TData> {
  return {
    ...ctx,
    ...updates,
  }
}
