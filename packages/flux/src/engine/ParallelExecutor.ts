import type { StepDefinition, StepExecution, WorkflowContext } from '../types'

/**
 * Result of a parallel group execution.
 *
 * Contains categorized lists of successful and failed step executions.
 */
export interface ParallelExecutionResult<
  TInput = unknown,
  TData extends Record<string, any> = Record<string, any>,
> {
  /** List of execution records for steps that completed successfully. */
  successes: StepExecution[]
  /** List of failures containing the step definition, the error, and the partial execution record. */
  failures: Array<{ step: StepDefinition<TInput, TData>; error: Error; execution: StepExecution }>
}

/**
 * Orchestrates the concurrent execution of multiple workflow steps.
 *
 * The ParallelExecutor manages the simultaneous execution of a group of steps,
 * collecting results and aggregating success/failure states. It uses `Promise.allSettled`
 * to ensure all steps are attempted even if some fail.
 *
 * @example
 * ```typescript
 * const parallelExecutor = new ParallelExecutor();
 * const { successes, failures } = await parallelExecutor.executeGroup(steps, ctx, runStepFn);
 * ```
 */
export class ParallelExecutor {
  /**
   * Executes a list of steps concurrently.
   *
   * @param steps - The definitions of the steps to run in parallel.
   * @param ctx - The shared workflow context.
   * @param executeStep - A callback function to execute a single step.
   * @returns A promise resolving to the aggregated execution results.
   */
  async executeGroup<TInput = unknown, TData extends Record<string, any> = Record<string, any>>(
    steps: StepDefinition<TInput, TData>[],
    ctx: WorkflowContext<TInput, TData>,
    executeStep: (
      step: StepDefinition<TInput, TData>,
      ctx: WorkflowContext<TInput, TData>
    ) => Promise<{ ctx: WorkflowContext<TInput, TData>; execution: StepExecution }>
  ): Promise<ParallelExecutionResult<TInput, TData>> {
    const results = await Promise.allSettled(
      steps.map(async (step, index) => {
        try {
          const result = await executeStep(step, ctx)
          return { step, result, index, success: true as const }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          return { step, error: err, index, success: false as const }
        }
      })
    )

    const successes: StepExecution[] = []
    const failures: Array<{
      step: StepDefinition<TInput, TData>
      error: Error
      execution: StepExecution
    }> = []

    for (const promiseResult of results) {
      if (promiseResult.status === 'fulfilled') {
        const value = promiseResult.value
        if (value.success) {
          successes.push(value.result.execution)
        } else {
          const failedExecution: StepExecution = {
            name: value.step.name,
            status: 'failed',
            startedAt: new Date(),
            error: value.error.message,
            retries: 0,
          }
          failures.push({
            step: value.step,
            error: value.error,
            execution: failedExecution,
          })
        }
      } else {
        const error =
          promiseResult.reason instanceof Error
            ? promiseResult.reason
            : new Error(String(promiseResult.reason))

        const failedExecution: StepExecution = {
          name: 'unknown-step',
          status: 'failed',
          startedAt: new Date(),
          error: error.message,
          retries: 0,
        }

        failures.push({
          step: steps[0]!,
          error,
          execution: failedExecution,
        })
      }
    }

    return { successes, failures }
  }
}
