/**
 * @fileoverview Step Executor for workflow steps
 *
 * Handles step execution with retry and timeout support.
 *
 * @module @gravito/flux/core
 */

import type {
  FluxWaitResult,
  StepDefinition,
  StepExecution,
  StepResult,
  WorkflowContext,
} from '../types'
import { updateStepExecution } from './executionUpdater'

/**
 * Handles the isolated execution of a single workflow step.
 *
 * The StepExecutor manages the operational aspects of step execution, including
 * condition checking, retry logic with exponential backoff, and timeout enforcement.
 *
 * @example
 * ```typescript
 * const executor = new StepExecutor({ defaultRetries: 3 });
 * const { result } = await executor.execute(stepDef, ctx, executionRecord);
 * ```
 */
export class StepExecutor {
  private defaultRetries: number
  private defaultTimeout: number
  private onRetry?: (
    step: StepDefinition<any, any>,
    ctx: WorkflowContext<any, any>,
    error: Error,
    attempt: number,
    maxRetries: number
  ) => void | Promise<void>

  /**
   * Creates a new StepExecutor with global defaults.
   *
   * @param options - Configuration for default behavior and lifecycle hooks.
   */
  constructor(
    options: {
      defaultRetries?: number
      defaultTimeout?: number
      onRetry?: (
        step: StepDefinition<any, any>,
        ctx: WorkflowContext<any, any>,
        error: Error,
        attempt: number,
        maxRetries: number
      ) => void | Promise<void>
    } = {}
  ) {
    this.defaultRetries = options.defaultRetries ?? 3
    this.defaultTimeout = options.defaultTimeout ?? 30000
    this.onRetry = options.onRetry
  }

  /**
   * Executes a step definition against a workflow context.
   *
   * This method performs the following sequence:
   * 1. Evaluates the `when` condition (if present).
   * 2. Initiates the execution loop with retries.
   * 3. Enforces timeouts for each attempt.
   * 4. Handles suspension signals (`flux_wait`).
   * 5. Updates the execution history record.
   *
   * @param step - The definition of the step to execute.
   * @param ctx - The current workflow context.
   * @param execution - The current execution record for this step.
   * @returns The result of the execution and the updated execution record.
   *
   * @throws {Error} If the step handler throws an unrecoverable error or times out.
   *
   * @example
   * ```typescript
   * const { result, execution } = await executor.execute(
   *   stepDefinition,
   *   currentContext,
   *   currentExecution
   * );
   *
   * if (!result.success) {
   *   console.error(result.error);
   * }
   * ```
   */
  async execute<TInput, TData extends Record<string, any>>(
    step: StepDefinition<TInput, TData>,
    ctx: WorkflowContext<TInput, TData>,
    execution: StepExecution
  ): Promise<{ result: StepResult; execution: StepExecution }> {
    const maxRetries = step.retries ?? this.defaultRetries
    const timeout = step.timeout ?? this.defaultTimeout
    const startTime = Date.now()
    let currentExecution = execution

    // Check condition
    if (step.when && !step.when(ctx)) {
      currentExecution = updateStepExecution(currentExecution, { status: 'skipped' })
      return {
        result: {
          success: true,
          duration: 0,
        },
        execution: currentExecution,
      }
    }

    currentExecution = updateStepExecution(currentExecution, {
      status: 'running',
      startedAt: new Date(),
    })

    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      currentExecution = updateStepExecution(currentExecution, { retries: attempt })

      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(step.handler, ctx, timeout)

        if (
          result &&
          typeof result === 'object' &&
          '__kind' in result &&
          result.__kind === 'flux_wait'
        ) {
          const duration = Date.now() - startTime
          currentExecution = updateStepExecution(currentExecution, {
            status: 'suspended',
            waitingFor: result.signal,
            suspendedAt: new Date(),
            duration,
          })

          return {
            result: {
              success: true,
              suspended: true,
              waitingFor: result.signal,
              duration,
            },
            execution: currentExecution,
          }
        }

        const duration = Date.now() - startTime
        currentExecution = updateStepExecution(currentExecution, {
          status: 'completed',
          completedAt: new Date(),
          duration,
        })

        return {
          result: {
            success: true,
            duration,
          },
          execution: currentExecution,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // If not last retry, continue
        if (attempt < maxRetries) {
          await this.onRetry?.(step, ctx, lastError, attempt + 1, maxRetries)
          // Exponential backoff
          await this.sleep(Math.min(1000 * 2 ** attempt, 10000))
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime
    currentExecution = updateStepExecution(currentExecution, {
      status: 'failed',
      completedAt: new Date(),
      duration,
      error: lastError?.message,
    })

    return {
      result: {
        success: false,
        error: lastError,
        duration,
      },
      execution: currentExecution,
    }
  }

  /**
   * Wraps the step handler in a timeout race.
   *
   * @param handler - The user-defined step handler.
   * @param ctx - The workflow context.
   * @param timeout - Maximum time allowed for execution in milliseconds.
   * @returns The handler result or a suspension signal.
   * @throws {Error} If the timeout is reached before the handler completes.
   * @private
   */
  private async executeWithTimeout<TInput, TData extends Record<string, any>>(
    handler: StepDefinition<TInput, TData>['handler'],
    ctx: WorkflowContext<TInput, TData>,
    timeout: number
  ): Promise<undefined | undefined | FluxWaitResult> {
    let timer: ReturnType<typeof setTimeout> | null = null
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Step timeout')), timeout)
      })

      return await Promise.race([Promise.resolve(handler(ctx)), timeoutPromise])
    } finally {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }

  /**
   * Pauses execution for a specified duration.
   *
   * @param ms - Milliseconds to sleep.
   * @private
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
