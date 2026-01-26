import type { ContextManager } from '../core/ContextManager'
import type { WorkflowContext, WorkflowDefinition, WorkflowStorage } from '../types'
import { updateWorkflowContext } from './stateUpdater'
import type { TraceEmitter } from './TraceEmitter'

/**
 * Manages the compensation (rollback) logic for failed workflows.
 *
 * The RollbackManager is responsible for executing `compensate` handlers defined
 * in workflow steps in reverse order when a workflow fails. This ensures eventual
 * consistency in distributed transactions (Saga pattern).
 */
export class RollbackManager {
  /**
   * Initializes the RollbackManager.
   *
   * @param storage - The storage adapter for persisting rollback progress.
   * @param contextManager - Manager for workflow context operations.
   * @param traceEmitter - Emitter for rollback-related trace events.
   * @param onPersist - Optional callback to handle custom persistence logic.
   */
  constructor(
    private storage: WorkflowStorage,
    private contextManager: ContextManager,
    private traceEmitter: TraceEmitter,
    private onPersist?: (ctx: WorkflowContext<any, any>) => Promise<WorkflowContext<any, any>>
  ) {}

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

    for (let i = failedAtIndex - 1; i >= 0; i--) {
      const step = definition.steps[i]
      let execution = currentCtx.history[i]

      if (!step || !step.compensate || !execution || execution.status !== 'completed') {
        continue
      }

      try {
        execution = { ...execution, status: 'compensating' }
        currentCtx = updateWorkflowContext(currentCtx, {
          history: currentCtx.history.map((h, idx) => (idx === i ? execution : h)),
        })
        currentCtx = await this.persist(currentCtx)

        await step.compensate(currentCtx)

        execution = { ...execution, status: 'compensated', compensatedAt: new Date() }
        currentCtx = updateWorkflowContext(currentCtx, {
          history: currentCtx.history.map((h, idx) => (idx === i ? execution : h)),
        })
        compensatedCount++

        await this.traceEmitter.stepCompensate(currentCtx, step.name, i)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        currentCtx = updateWorkflowContext(currentCtx, { status: 'failed' })

        await this.traceEmitter.emit({
          type: 'workflow:error',
          timestamp: Date.now(),
          workflowId: currentCtx.id,
          workflowName: currentCtx.name,
          status: 'failed',
          error: `Compensation failed at step "${step.name}": ${error.message}`,
        })
        return currentCtx
      }

      currentCtx = await this.persist(currentCtx)
    }

    if (compensatedCount > 0) {
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
}
