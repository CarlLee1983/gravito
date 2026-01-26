import type { ContextManager } from '../core/ContextManager'
import type { StateMachine } from '../core/StateMachine'
import type { StepExecutor } from '../core/StepExecutor'
import type {
  FluxConfig,
  FluxResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowStorage,
} from '../types'
import { updateWorkflowContext } from './stateUpdater'
import type { TraceEmitter } from './TraceEmitter'

/**
 * Internal component responsible for the sequential execution of workflow steps.
 *
 * WorkflowExecutor handles the iteration over steps, interaction with the StepExecutor,
 * state machine transitions, and persistence between steps.
 */
export class WorkflowExecutor {
  /**
   * Initializes the WorkflowExecutor.
   *
   * @param storage - The storage adapter for persistence.
   * @param contextManager - Manager for workflow context operations.
   * @param stepExecutor - Executor for individual steps.
   * @param traceEmitter - Emitter for execution-related trace events.
   * @param config - Global engine configuration.
   * @param onPersist - Optional callback for custom persistence logic.
   */
  constructor(
    private storage: WorkflowStorage,
    private contextManager: ContextManager,
    private stepExecutor: StepExecutor,
    private traceEmitter: TraceEmitter,
    private config: FluxConfig = {},
    private onPersist?: (ctx: WorkflowContext<any, any>) => Promise<WorkflowContext<any, any>>
  ) {}

  /**
   * Executes the steps of a workflow definition.
   *
   * This method manages the loop over workflow steps, handling suspensions,
   * failures, and successful completions.
   *
   * @param definition - The workflow definition to execute.
   * @param ctx - The current workflow context.
   * @param stateMachine - The state machine governing the workflow status.
   * @param startTime - The timestamp when the workflow execution originally started.
   * @param startIndex - The index of the step to start execution from.
   * @param meta - Metadata about the execution (e.g., if it's a resume or retry).
   * @returns A promise resolving to the result of the workflow execution.
   *
   * @example
   * ```typescript
   * const result = await executor.execute(definition, ctx, stateMachine, Date.now(), 0);
   * ```
   */
  async execute<TInput, TData extends Record<string, any> = Record<string, any>>(
    definition: WorkflowDefinition<TInput, TData>,
    ctx: WorkflowContext<TInput, TData>,
    stateMachine: StateMachine,
    startTime: number,
    startIndex: number,
    meta?: { resume?: boolean; retry?: boolean; fromStep?: number }
  ): Promise<FluxResult<TData>> {
    let currentCtx = ctx
    try {
      if (stateMachine.canExecute()) {
        stateMachine.transition('running')
        currentCtx = updateWorkflowContext(currentCtx, { status: 'running' })
      }

      if (!meta?.resume && !meta?.retry) {
        await this.traceEmitter.workflowStart(currentCtx)
      }

      for (let i = startIndex; i < definition.steps.length; i++) {
        const step = definition.steps[i]!
        let execution = currentCtx.history[i]!

        currentCtx = this.contextManager.setStepName(currentCtx, i, step.name)
        execution = currentCtx.history[i]!
        currentCtx = updateWorkflowContext(currentCtx, { currentStep: i })

        this.config.on?.stepStart?.(step.name, currentCtx as any)
        await this.traceEmitter.stepStart(currentCtx, step.name, i, Boolean(step.commit))

        const { result, execution: updatedExecution } = await this.stepExecutor.execute(
          step,
          currentCtx,
          execution
        )
        execution = updatedExecution
        currentCtx = updateWorkflowContext(currentCtx, {
          history: currentCtx.history.map((h, idx) => (idx === i ? execution : h)),
        })

        if (result.success) {
          if (result.suspended) {
            stateMachine.transition('suspended')
            currentCtx = updateWorkflowContext(currentCtx, { status: 'suspended' })

            await this.traceEmitter.stepSuspended(currentCtx, step.name, i, result.waitingFor!)
            currentCtx = await this.persist(currentCtx)

            return {
              id: currentCtx.id,
              status: 'suspended',
              data: currentCtx.data as TData,
              history: currentCtx.history,
              duration: Date.now() - startTime,
              version: currentCtx.version,
            }
          }

          this.config.on?.stepComplete?.(step.name, currentCtx as any, result)
          await this.traceEmitter.stepComplete(currentCtx, step.name, i, result)
        } else {
          await this.traceEmitter.stepError(currentCtx, step.name, i, result)
          return {
            id: currentCtx.id,
            status: 'failed',
            data: currentCtx.data as TData,
            history: currentCtx.history,
            duration: Date.now() - startTime,
            error: result.error,
            version: currentCtx.version,
          }
        }

        currentCtx = await this.persist(currentCtx)
      }

      stateMachine.transition('completed')
      currentCtx = updateWorkflowContext(currentCtx, { status: 'completed' })

      currentCtx = await this.persist(currentCtx)

      this.config.on?.workflowComplete?.(currentCtx as any)
      await this.traceEmitter.workflowComplete(currentCtx, Date.now() - startTime)

      return {
        id: currentCtx.id,
        status: 'completed',
        data: currentCtx.data as TData,
        history: currentCtx.history,
        duration: Date.now() - startTime,
        version: currentCtx.version,
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      stateMachine.forceStatus('failed')
      currentCtx = updateWorkflowContext(currentCtx, { status: 'failed' })

      currentCtx = await this.persist(currentCtx)

      this.config.on?.workflowError?.(currentCtx as any, err)
      await this.traceEmitter.workflowError(currentCtx, err, Date.now() - startTime)

      return {
        id: currentCtx.id,
        status: 'failed',
        data: currentCtx.data as TData,
        history: currentCtx.history,
        duration: Date.now() - startTime,
        error: err,
        version: currentCtx.version,
      }
    }
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
