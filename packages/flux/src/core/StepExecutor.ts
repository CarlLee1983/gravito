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
 * Step Executor
 *
 * Executes individual workflow steps with retry and timeout support.
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
   * Execute a step with retry and timeout
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
   * Execute handler with timeout
   */
  private async executeWithTimeout<TInput, TData extends Record<string, any>>(
    handler: StepDefinition<TInput, TData>['handler'],
    ctx: WorkflowContext<TInput, TData>,
    timeout: number
  ): Promise<void | undefined | FluxWaitResult> {
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
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
