import type { ContextManager } from '../core/ContextManager'
import { IdempotencyGuard } from '../core/IdempotencyGuard'
import { CompensationRetryPolicy } from '../engine/CompensationRetryPolicy'
import { RecoveryManager } from '../engine/RecoveryManager'
import type { WorkflowContext, WorkflowDefinition, WorkflowStorage } from '../types'
import { updateWorkflowContext } from './stateUpdater'
import type { TraceEmitter } from './TraceEmitter'

/**
 * Configuration options for the RollbackManager.
 */
export interface RollbackManagerConfig {
  /** Policy for retrying failed compensation steps. */
  retryPolicy?: CompensationRetryPolicy
  /** Guard for preventing duplicate compensations. */
  idempotencyGuard?: IdempotencyGuard
  /** Manager for handling manual recovery interventions. */
  recoveryManager?: RecoveryManager
}

/**
 * Manages the compensation (rollback) logic for failed workflows.
 *
 * The RollbackManager is responsible for executing `compensate` handlers defined
 * in workflow steps in reverse order when a workflow fails. This ensures eventual
 * consistency in distributed transactions (Saga pattern).
 *
 * Enhanced with:
 * - Automatic retry with exponential backoff
 * - Idempotency checks to prevent duplicate compensation
 * - Human-in-the-loop recovery for failed compensations
 *
 * @example
 * ```typescript
 * const rollbackManager = new RollbackManager(
 *   storage,
 *   contextManager,
 *   traceEmitter
 * );
 * ```
 */
export class RollbackManager {
  private retryPolicy: CompensationRetryPolicy
  private idempotencyGuard: IdempotencyGuard
  private recoveryManager: RecoveryManager

  /**
   * Initializes the RollbackManager.
   *
   * @param storage - The storage adapter for persisting rollback progress.
   * @param contextManager - Manager for workflow context operations.
   * @param traceEmitter - Emitter for rollback-related trace events.
   * @param onPersist - Optional callback to handle custom persistence logic.
   * @param config - Optional configuration for retry, idempotency, and recovery.
   */
  constructor(
    private storage: WorkflowStorage,
    private contextManager: ContextManager,
    private traceEmitter: TraceEmitter,
    private onPersist?: (ctx: WorkflowContext<any, any>) => Promise<WorkflowContext<any, any>>,
    config?: RollbackManagerConfig
  ) {
    this.retryPolicy = config?.retryPolicy ?? new CompensationRetryPolicy()
    this.idempotencyGuard = config?.idempotencyGuard ?? new IdempotencyGuard()
    this.recoveryManager = config?.recoveryManager ?? new RecoveryManager()
  }

  /**
   * Executes the rollback process for a failed workflow.
   *
   * Iterates backwards from the failed step and executes the `compensate` handler
   * for each completed step that has one defined.
   *
   * @param definition - The definition of the workflow being rolled back.
   * @param ctx - The current workflow context.
   * @param failedAtIndex - The index of the step where the failure occurred.
   * @param originalError - The error that triggered the rollback.
   * @returns A promise resolving to the updated workflow context after rollback.
   * @throws {Error} If compensation logic itself fails and recovery options are exhausted.
   *
   * @example
   * ```typescript
   * const rolledBackCtx = await rollbackManager.rollback(
   *   definition,
   *   ctx,
   *   failedIndex,
   *   error
   * );
   * ```
   */
  async rollback<TInput, TData extends Record<string, any> = Record<string, any>>(
    definition: WorkflowDefinition<TInput, TData>,
    ctx: WorkflowContext<TInput, TData>,
    failedAtIndex: number,
    originalError: Error
  ): Promise<WorkflowContext<TInput, TData>> {
    let currentCtx = updateWorkflowContext(ctx, { status: 'rolling_back' })

    await this.traceEmitter.emit({
      type: 'workflow:rollback_start',
      timestamp: Date.now(),
      workflowId: currentCtx.id,
      workflowName: currentCtx.name,
      status: 'rolling_back',
      error: originalError.message,
    })

    let compensatedCount = 0
    let skippedCount = 0

    for (let i = failedAtIndex - 1; i >= 0; i--) {
      const step = definition.steps[i]
      let execution = currentCtx.history[i]

      if (!step || !step.compensate || !execution || execution.status !== 'completed') {
        continue
      }

      if (this.idempotencyGuard.isCompensated(currentCtx, step.name)) {
        continue
      }

      try {
        execution = { ...execution, status: 'compensating' }
        currentCtx = updateWorkflowContext(currentCtx, {
          history: currentCtx.history.map((h, idx) => (idx === i ? execution : h)),
        })
        currentCtx = await this.persist(currentCtx)

        if (this.retryPolicy.getConfig().maxAttempts === 0) {
          await step.compensate?.(currentCtx)
        } else {
          const result = await this.retryPolicy.execute(async () => {
            await step.compensate?.(currentCtx)
          })

          if (!result.success) {
            throw result.error ?? new Error('Compensation failed')
          }
        }

        execution = { ...execution, status: 'compensated', compensatedAt: new Date() }
        currentCtx = updateWorkflowContext(currentCtx, {
          history: currentCtx.history.map((h, idx) => (idx === i ? execution : h)),
        })
        compensatedCount++

        await this.traceEmitter.stepCompensate(currentCtx, step.name, i)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))

        const action = this.recoveryManager.getAction(step.name)

        if (action?.type === 'retry') {
          const retryResult = await new CompensationRetryPolicy({
            ...this.retryPolicy.getConfig(),
            maxAttempts: action.maxAttempts ?? this.retryPolicy.getConfig().maxAttempts,
          }).execute(async () => {
            await step.compensate?.(currentCtx)
          })

          if (retryResult.success) {
            execution = { ...execution, status: 'compensated', compensatedAt: new Date() }
            currentCtx = updateWorkflowContext(currentCtx, {
              history: currentCtx.history.map((h, idx) => (idx === i ? execution : h)),
            })
            compensatedCount++

            await this.traceEmitter.stepCompensate(currentCtx, step.name, i)
            currentCtx = await this.persist(currentCtx)
            continue
          }
        }

        if (action?.type === 'skip') {
          execution = { ...execution, status: 'completed', error: error.message }
          currentCtx = updateWorkflowContext(currentCtx, {
            history: currentCtx.history.map((h, idx) => (idx === i ? execution : h)),
          })
          currentCtx = await this.persist(currentCtx)
          skippedCount++
          continue
        }

        if (action?.type === 'abort') {
          currentCtx = updateWorkflowContext(currentCtx, { status: 'compensation_failed' })
          currentCtx = await this.persist(currentCtx)
          await this.traceEmitter.emit({
            type: 'workflow:error',
            timestamp: Date.now(),
            workflowId: currentCtx.id,
            workflowName: currentCtx.name,
            status: 'compensation_failed',
            error: `Compensation aborted at step "${step.name}": ${error.message}`,
          })
          return currentCtx
        }

        await this.recoveryManager.notifyRecoveryNeeded(currentCtx, step.name, error)
        currentCtx = updateWorkflowContext(currentCtx, { status: 'compensation_failed' })
        currentCtx = await this.persist(currentCtx)
        await this.traceEmitter.emit({
          type: 'workflow:error',
          timestamp: Date.now(),
          workflowId: currentCtx.id,
          workflowName: currentCtx.name,
          status: 'compensation_failed',
          error: `Compensation failed at step "${step.name}": ${error.message}`,
        })
        return currentCtx
      }

      currentCtx = await this.persist(currentCtx)
    }

    if (compensatedCount > 0 || skippedCount > 0) {
      currentCtx = updateWorkflowContext(currentCtx, { status: 'rolled_back' })
      await this.traceEmitter.emit({
        type: 'workflow:rollback_complete',
        timestamp: Date.now(),
        workflowId: currentCtx.id,
        workflowName: currentCtx.name,
        status: 'rolled_back',
      })
    } else {
      currentCtx = updateWorkflowContext(currentCtx, { status: 'failed' })
    }

    return currentCtx
  }

  /**
   * Persists the current context using the configured mechanism.
   * @private
   */
  private async persist<TInput, TData extends Record<string, any>>(
    ctx: WorkflowContext<TInput, TData>
  ): Promise<WorkflowContext<TInput, TData>> {
    if (this.onPersist) {
      return await this.onPersist(ctx)
    } else {
      await this.storage.save(this.contextManager.toState(ctx))
      return ctx
    }
  }

  /**
   * Gets the retry policy instance used by this manager.
   * @returns The CompensationRetryPolicy instance.
   */
  getRetryPolicy(): CompensationRetryPolicy {
    return this.retryPolicy
  }

  /**
   * Gets the idempotency guard instance used by this manager.
   * @returns The IdempotencyGuard instance.
   */
  getIdempotencyGuard(): IdempotencyGuard {
    return this.idempotencyGuard
  }

  /**
   * Gets the recovery manager instance used by this manager.
   * @returns The RecoveryManager instance.
   */
  getRecoveryManager(): RecoveryManager {
    return this.recoveryManager
  }
}
