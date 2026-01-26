import type { FluxTraceEvent, FluxTraceSink, StepResult, WorkflowContext } from '../types'

/**
 * Responsible for emitting observability events throughout the workflow lifecycle.
 *
 * TraceEmitter abstracts the underlying trace sink and provides semantic methods
 * for logging workflow and step-level events such as starts, completions, and errors.
 */
export class TraceEmitter {
  /**
   * Initializes the TraceEmitter.
   *
   * @param traceSink - The destination for trace events.
   */
  constructor(private traceSink?: FluxTraceSink) {}

  /**
   * Emits a raw trace event to the configured sink.
   *
   * @param event - The trace event to emit.
   */
  async emit(event: FluxTraceEvent): Promise<void> {
    try {
      await this.traceSink?.emit(event)
    } catch {}
  }

  /**
   * Emits an event indicating that a workflow has started.
   *
   * @param ctx - The workflow context at the start.
   */
  async workflowStart(ctx: WorkflowContext): Promise<void> {
    await this.emit({
      type: 'workflow:start',
      timestamp: Date.now(),
      workflowId: ctx.id,
      workflowName: ctx.name,
      status: 'running',
      input: ctx.input,
    })
  }

  /**
   * Emits an event indicating that a workflow has completed successfully.
   *
   * @param ctx - The final workflow context.
   * @param duration - The total execution time in milliseconds.
   */
  async workflowComplete(ctx: WorkflowContext, duration: number): Promise<void> {
    await this.emit({
      type: 'workflow:complete',
      timestamp: Date.now(),
      workflowId: ctx.id,
      workflowName: ctx.name,
      status: 'completed',
      duration,
      data: ctx.data as Record<string, unknown>,
    })
  }

  /**
   * Emits an event indicating that a workflow has failed.
   *
   * @param ctx - The workflow context at the time of failure.
   * @param error - The error that caused the failure.
   * @param duration - The execution time until failure in milliseconds.
   */
  async workflowError(ctx: WorkflowContext, error: Error, duration: number): Promise<void> {
    await this.emit({
      type: 'workflow:error',
      timestamp: Date.now(),
      workflowId: ctx.id,
      workflowName: ctx.name,
      status: 'failed',
      duration,
      error: error.message,
    })
  }

  /**
   * Emits an event indicating that a specific step has started.
   *
   * @param ctx - The current workflow context.
   * @param stepName - The name of the step.
   * @param stepIndex - The index of the step in the workflow.
   * @param commit - Whether the step is a commit step.
   */
  async stepStart(
    ctx: WorkflowContext,
    stepName: string,
    stepIndex: number,
    commit: boolean
  ): Promise<void> {
    await this.emit({
      type: 'step:start',
      timestamp: Date.now(),
      workflowId: ctx.id,
      workflowName: ctx.name,
      stepName,
      stepIndex,
      commit,
      status: 'running',
    })
  }

  /**
   * Emits an event indicating that a step has completed successfully.
   *
   * @param ctx - The current workflow context.
   * @param stepName - The name of the step.
   * @param stepIndex - The index of the step.
   * @param result - The result of the step execution.
   */
  async stepComplete(
    ctx: WorkflowContext,
    stepName: string,
    stepIndex: number,
    result: StepResult
  ): Promise<void> {
    await this.emit({
      type: 'step:complete',
      timestamp: Date.now(),
      workflowId: ctx.id,
      workflowName: ctx.name,
      stepName,
      stepIndex,
      duration: result.duration,
      status: 'completed',
    })
  }

  /**
   * Emits an event indicating that a step has failed.
   *
   * @param ctx - The current workflow context.
   * @param stepName - The name of the step.
   * @param stepIndex - The index of the step.
   * @param result - The result containing the error.
   */
  async stepError(
    ctx: WorkflowContext,
    stepName: string,
    stepIndex: number,
    result: StepResult
  ): Promise<void> {
    await this.emit({
      type: 'step:error',
      timestamp: Date.now(),
      workflowId: ctx.id,
      workflowName: ctx.name,
      stepName,
      stepIndex,
      duration: result.duration,
      error: result.error?.message,
      status: 'failed',
    })
  }

  /**
   * Emits an event indicating that a step has been suspended.
   *
   * @param ctx - The current workflow context.
   * @param stepName - The name of the step.
   * @param stepIndex - The index of the step.
   * @param signal - The name of the signal the step is waiting for.
   */
  async stepSuspended(
    ctx: WorkflowContext,
    stepName: string,
    stepIndex: number,
    signal: string
  ): Promise<void> {
    await this.emit({
      type: 'step:suspend',
      timestamp: Date.now(),
      workflowId: ctx.id,
      workflowName: ctx.name,
      stepName,
      stepIndex,
      meta: { signal },
    })
  }

  /**
   * Emits an event indicating that a step's compensation logic has been executed.
   *
   * @param ctx - The current workflow context.
   * @param stepName - The name of the step being compensated.
   * @param stepIndex - The index of the step.
   */
  async stepCompensate(ctx: WorkflowContext, stepName: string, stepIndex: number): Promise<void> {
    await this.emit({
      type: 'step:compensate',
      timestamp: Date.now(),
      workflowId: ctx.id,
      workflowName: ctx.name,
      stepName,
      stepIndex,
      status: 'compensated',
    })
  }
}
