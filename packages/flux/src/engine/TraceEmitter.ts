import type { FluxTraceEvent, FluxTraceSink, StepResult, WorkflowContext } from '../types'

export class TraceEmitter {
  constructor(private traceSink?: FluxTraceSink) {}

  async emit(event: FluxTraceEvent): Promise<void> {
    try {
      await this.traceSink?.emit(event)
    } catch {}
  }

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
