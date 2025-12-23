/**
 * @fileoverview Step Executor for workflow steps
 *
 * Handles step execution with retry and timeout support.
 *
 * @module @gravito/flux/core
 */

import type { StepDefinition, StepExecution, StepResult, WorkflowContext } from '../types'

/**
 * Step Executor
 *
 * Executes individual workflow steps with retry and timeout support.
 */
export class StepExecutor {
  private defaultRetries: number
  private defaultTimeout: number

  constructor(options: { defaultRetries?: number; defaultTimeout?: number } = {}) {
    this.defaultRetries = options.defaultRetries ?? 3
    this.defaultTimeout = options.defaultTimeout ?? 30000
  }

  /**
   * Execute a step with retry and timeout
   */
  async execute(
    step: StepDefinition,
    ctx: WorkflowContext,
    execution: StepExecution
  ): Promise<StepResult> {
    const maxRetries = step.retries ?? this.defaultRetries
    const timeout = step.timeout ?? this.defaultTimeout
    const startTime = Date.now()

    // Check condition
    if (step.when && !step.when(ctx)) {
      execution.status = 'skipped'
      return {
        success: true,
        duration: 0,
      }
    }

    execution.status = 'running'
    execution.startedAt = new Date()

    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      execution.retries = attempt

      try {
        // Execute with timeout
        await this.executeWithTimeout(step.handler, ctx, timeout)

        execution.status = 'completed'
        execution.completedAt = new Date()
        execution.duration = Date.now() - startTime

        return {
          success: true,
          duration: execution.duration,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // If not last retry, continue
        if (attempt < maxRetries) {
          // Exponential backoff
          await this.sleep(Math.min(1000 * 2 ** attempt, 10000))
        }
      }
    }

    // All retries failed
    execution.status = 'failed'
    execution.completedAt = new Date()
    execution.duration = Date.now() - startTime
    execution.error = lastError?.message

    return {
      success: false,
      error: lastError,
      duration: execution.duration,
    }
  }

  /**
   * Execute handler with timeout
   */
  private async executeWithTimeout(
    handler: (ctx: WorkflowContext) => Promise<void> | void,
    ctx: WorkflowContext,
    timeout: number
  ): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Step timeout')), timeout)
    })

    await Promise.race([Promise.resolve(handler(ctx)), timeoutPromise])
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
