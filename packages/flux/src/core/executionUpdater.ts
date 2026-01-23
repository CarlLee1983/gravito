import type { StepExecution } from '../types'

export function updateStepExecution(
  execution: StepExecution,
  updates: Partial<StepExecution>
): StepExecution {
  return {
    ...execution,
    ...updates,
  }
}
