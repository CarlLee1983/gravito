import type { ContextManager } from '../core/ContextManager'
import type { DataOptimizer } from '../core/DataOptimizer'
import type { StateMachine } from '../core/StateMachine'
import type { StepExecutor } from '../core/StepExecutor'
import type {
  FluxConfig,
  FluxResult,
  StepDefinition,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowStorage,
} from '../types'
import { ParallelExecutor } from './ParallelExecutor'
import { updateWorkflowContext } from './stateUpdater'
import type { TraceEmitter } from './TraceEmitter'

/**
 * Internal component responsible for the sequential execution of workflow steps.
 *
 * WorkflowExecutor handles the iteration over steps, interaction with the StepExecutor,
 * state machine transitions, and persistence between steps. It also coordinates
 * parallel execution groups.
 *
 * @example
 * ```typescript
 * const executor = new WorkflowExecutor(
 *   storage,
 *   contextManager,
 *   stepExecutor,
 *   traceEmitter
 * );
 * ```
 */
export class WorkflowExecutor {
  private parallelExecutor: ParallelExecutor

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
    private onPersist?: (ctx: WorkflowContext<any, any>) => Promise<WorkflowContext<any, any>>,
    private optimizer?: DataOptimizer
  ) {
    this.parallelExecutor = new ParallelExecutor()
  }

  /**
   * Executes the steps of a workflow definition.
   *
   * This method manages the loop over workflow steps, handling suspensions,
   * failures, and successful completions. It delegates parallel step groups
   * to the ParallelExecutor.
   *
   * @param definition - The workflow definition to execute.
   * @param ctx - The current workflow context.
   * @param stateMachine - The state machine governing the workflow status.
   * @param startTime - The timestamp when the workflow execution originally started.
   * @param startIndex - The index of the step to start execution from.
   * @param meta - Metadata about the execution (e.g., if it's a resume or retry).
   * @returns A promise resolving to the result of the workflow execution.
   * @throws {Error} If execution fails and no rollback/recovery was successful (handled internally but re-thrown if critical).
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

      for (let i = startIndex; i < definition.steps.length; ) {
        const step = definition.steps[i]!

        if (step.parallelGroup) {
          const { lastIndex, updatedCtx, result } = await this.executeParallelGroup(
            definition,
            currentCtx,
            i,
            startTime
          )
          currentCtx = updatedCtx
          currentCtx = await this.persist(currentCtx)
          if (result) {
            return result
          }
          i = lastIndex + 1
        } else {
          const { updatedCtx, shouldReturn, result } = await this.executeSequentialStep(
            definition,
            currentCtx,
            i,
            startTime,
            stateMachine
          )
          currentCtx = updatedCtx
          currentCtx = await this.persist(currentCtx)
          if (shouldReturn && result) {
            return result
          }
          i++
        }
      }

      stateMachine.transition('completed')
      currentCtx = updateWorkflowContext(currentCtx, { status: 'completed' })

      currentCtx = await this.persist(currentCtx)

      this.config.on?.workflowComplete?.(currentCtx)
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
      console.log(
        'In catch block, history:',
        currentCtx.history.map((h) => ({ name: h.name, status: h.status }))
      )
      const err = error instanceof Error ? error : new Error(String(error))
      stateMachine.forceStatus('failed')
      currentCtx = updateWorkflowContext(currentCtx, { status: 'failed' })

      currentCtx = await this.persist(currentCtx)

      this.config.on?.workflowError?.(currentCtx, err)
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

  /**
   * Executes a single sequential step.
   * @private
   */
  private async executeSequentialStep<TInput, TData extends Record<string, any>>(
    definition: WorkflowDefinition<TInput, TData>,
    ctx: WorkflowContext<TInput, TData>,
    index: number,
    startTime: number,
    stateMachine: StateMachine
  ): Promise<{
    updatedCtx: WorkflowContext<TInput, TData>
    shouldReturn: boolean
    result?: FluxResult<TData>
  }> {
    const step = definition.steps[index]!
    let execution = ctx.history[index]!
    let currentCtx = ctx

    currentCtx = this.contextManager.setStepName(currentCtx, index, step.name)
    execution = currentCtx.history[index]!
    currentCtx = updateWorkflowContext(currentCtx, { currentStep: index })

    this.config.on?.stepStart?.(step.name, currentCtx)
    await this.traceEmitter.stepStart(currentCtx, step.name, index, Boolean(step.commit))

    const { result, execution: updatedExecution } = await this.stepExecutor.execute(
      step,
      currentCtx,
      execution
    )
    execution = updatedExecution
    currentCtx = updateWorkflowContext(currentCtx, {
      history: currentCtx.history.map((h, idx) => (idx === index ? execution : h)),
    })

    if (result.success) {
      if (result.suspended) {
        stateMachine.transition('suspended')
        currentCtx = updateWorkflowContext(currentCtx, { status: 'suspended' })
        await this.traceEmitter.stepSuspended(currentCtx, step.name, index, result.waitingFor!)

        const suspendedResult: FluxResult<TData> = {
          id: currentCtx.id,
          status: 'suspended',
          data: currentCtx.data as TData,
          history: currentCtx.history,
          duration: Date.now() - startTime,
          version: currentCtx.version,
        }
        return { updatedCtx: currentCtx, shouldReturn: true, result: suspendedResult }
      }

      this.config.on?.stepComplete?.(step.name, currentCtx, result)
      await this.traceEmitter.stepComplete(currentCtx, step.name, index, result)
    } else {
      await this.traceEmitter.stepError(currentCtx, step.name, index, result)
      const failedResult: FluxResult<TData> = {
        id: currentCtx.id,
        status: 'failed',
        data: currentCtx.data as TData,
        history: currentCtx.history,
        duration: Date.now() - startTime,
        error: result.error,
        version: currentCtx.version,
      }
      return { updatedCtx: currentCtx, shouldReturn: true, result: failedResult }
    }

    return { updatedCtx: currentCtx, shouldReturn: false }
  }

  /**
   * Executes a group of parallel steps.
   * @private
   */
  private async executeParallelGroup<TInput, TData extends Record<string, any>>(
    definition: WorkflowDefinition<TInput, TData>,
    ctx: WorkflowContext<TInput, TData>,
    startIndex: number,
    startTime: number
  ): Promise<{
    lastIndex: number
    updatedCtx: WorkflowContext<TInput, TData>
    result?: FluxResult<TData>
  }> {
    const firstStep = definition.steps[startIndex]!
    const groupId = firstStep.parallelGroup!
    const groupSteps: Array<{ step: StepDefinition<TInput, TData>; index: number }> = []

    for (let i = startIndex; i < definition.steps.length; i++) {
      const step = definition.steps[i]!
      if (step.parallelGroup === groupId) {
        groupSteps.push({ step, index: i })
      } else {
        break
      }
    }

    const lastIndex = groupSteps[groupSteps.length - 1]?.index
    let currentCtx = ctx

    const executeStepWrapper = async (
      step: StepDefinition<TInput, TData>,
      stepCtx: WorkflowContext<TInput, TData>
    ) => {
      const stepIndex = groupSteps.find((gs) => gs.step === step)?.index
      let execution = stepCtx.history[stepIndex!]!

      const localCtx = this.contextManager.setStepName(stepCtx, stepIndex!, step.name)
      execution = localCtx.history[stepIndex!]!

      this.config.on?.stepStart?.(step.name, localCtx)
      await this.traceEmitter.stepStart(localCtx, step.name, stepIndex!, Boolean(step.commit))

      const { result, execution: updatedExecution } = await this.stepExecutor.execute(
        step,
        localCtx,
        execution
      )

      if (result.success) {
        this.config.on?.stepComplete?.(step.name, localCtx, result)
        await this.traceEmitter.stepComplete(localCtx, step.name, stepIndex!, result)
      } else {
        await this.traceEmitter.stepError(localCtx, step.name, stepIndex!, result)
        throw result.error || new Error(`Step ${step.name} failed`)
      }

      return { ctx: localCtx, execution: updatedExecution }
    }

    try {
      const parallelResult = await this.parallelExecutor.executeGroup(
        groupSteps.map((gs) => gs.step),
        currentCtx,
        executeStepWrapper
      )

      for (const execution of parallelResult.successes) {
        const stepIndex = groupSteps.find((gs) => gs.step.name === execution.name)?.index
        currentCtx = updateWorkflowContext(currentCtx, {
          history: currentCtx.history.map((h, idx) => (idx === stepIndex ? execution : h)),
        })
      }

      for (const failure of parallelResult.failures) {
        const stepIndex = groupSteps.find((gs) => gs.step.name === failure.step.name)?.index
        currentCtx = updateWorkflowContext(currentCtx, {
          history: currentCtx.history.map((h, idx) => (idx === stepIndex ? failure.execution : h)),
        })
      }

      if (parallelResult.failures.length > 0) {
        const firstFailure = parallelResult.failures[0]!
        const failedResult: FluxResult<TData> = {
          id: currentCtx.id,
          status: 'failed',
          data: currentCtx.data as TData,
          history: currentCtx.history,
          duration: Date.now() - startTime,
          error: firstFailure.error,
          version: currentCtx.version,
        }
        return { lastIndex, updatedCtx: currentCtx, result: failedResult }
      }

      return { lastIndex, updatedCtx: currentCtx }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const failedResult: FluxResult<TData> = {
        id: currentCtx.id,
        status: 'failed',
        data: currentCtx.data as TData,
        history: currentCtx.history,
        duration: Date.now() - startTime,
        error: err,
        version: currentCtx.version,
      }
      return { lastIndex, updatedCtx: currentCtx, result: failedResult }
    }
  }

  /**
   * Persists the context to storage.
   * @private
   */
  private async persist<TInput, TData extends Record<string, any>>(
    ctx: WorkflowContext<TInput, TData>
  ): Promise<WorkflowContext<TInput, TData>> {
    let currentCtx = ctx
    if (this.optimizer) {
      const optimizedData = this.optimizer.optimizeForStorage(ctx.data) as TData
      currentCtx = updateWorkflowContext(ctx, { data: optimizedData })
    }

    if (this.onPersist) {
      return await this.onPersist(currentCtx)
    } else {
      await this.storage.save(this.contextManager.toState(currentCtx))
      return currentCtx
    }
  }
}
