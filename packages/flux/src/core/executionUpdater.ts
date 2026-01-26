import type { StepExecution } from '../types'

/**
 * Performs an immutable update on a step execution record.
 *
 * This utility ensures that execution history remains consistent by returning
 * a new object with the merged updates, preserving the original record.
 *
 * @param execution - The current execution record to update.
 * @param updates - A partial object containing the fields to be modified.
 * @returns A new StepExecution instance with the applied changes.
 *
 * @example
 * ```typescript
 * const updated = updateStepExecution(record, { status: 'completed', duration: 150 });
 * ```
 */
export function updateStepExecution(
  execution: StepExecution,
  updates: Partial<StepExecution>
): StepExecution {
  return {
    ...execution,
    ...updates,
  }
}
