import type { WorkflowContext } from '../types'

export function updateWorkflowContext<TInput, TData extends Record<string, any>>(
  ctx: WorkflowContext<TInput, TData>,
  updates: Partial<WorkflowContext<TInput, TData>>
): WorkflowContext<TInput, TData> {
  return {
    ...ctx,
    ...updates,
  }
}
