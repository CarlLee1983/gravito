import { WorkflowBuilder } from '../builder/WorkflowBuilder'
import type { ContextManager } from '../core/ContextManager'
import { StepExecutor } from '../core/StepExecutor'
import * as Errors from '../errors'
import type {
  FluxConfig,
  FluxResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowStorage,
} from '../types'
import type { RollbackManager } from './RollbackManager'
import { updateWorkflowContext } from './stateUpdater'
import type { TraceEmitter } from './TraceEmitter'

/**
 * Internal helper utilities for the FluxEngine.
 */

/**
 * Creates and configures a StepExecutor with tracing support.
 */
export function createStepExecutor(config: FluxConfig, traceEmitter: TraceEmitter): StepExecutor {
  return new StepExecutor({
    defaultRetries: config.defaultRetries,
    defaultTimeout: config.defaultTimeout,
    onRetry: async (step, ctx, error, attempt, maxRetries) => {
      await traceEmitter.emit({
        type: 'step:retry',
        timestamp: Date.now(),
        workflowId: ctx.id,
        workflowName: ctx.name,
        stepName: step.name,
        stepIndex: ctx.currentStep,
        commit: Boolean(step.commit),
        retries: attempt,
        maxRetries,
        error: error.message,
        status: 'running',
      })
    },
  })
}

/**
 * Resolves a workflow definition from a builder or a raw definition.
 */
export function resolveDefinition<TInput, TData>(
  workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>
): WorkflowDefinition<TInput, TData> {
  return workflow instanceof WorkflowBuilder ? workflow.build() : workflow
}

/**
 * Resolves the starting index for workflow execution, supporting step names or numeric indices.
 */
export function resolveStartIndex<TInput, TData>(
  definition: WorkflowDefinition<TInput, TData>,
  fromStep: number | string | undefined,
  fallback: number
): number {
  if (typeof fromStep === 'number') {
    if (fromStep < 0 || fromStep >= definition.steps.length) {
      throw Errors.invalidStepIndex(fromStep)
    }
    return fromStep
  }
  if (typeof fromStep === 'string') {
    const index = definition.steps.findIndex((step) => step.name === fromStep)
    if (index === -1) {
      throw Errors.stepNotFound(fromStep)
    }
    return index
  }
  return Math.max(0, Math.min(fallback, definition.steps.length - 1))
}

/**
 * Resets the execution history from a given step index.
 */
export function resetHistoryFrom<TInput, TData>(
  ctx: WorkflowContext<TInput, TData>,
  startIndex: number
): void {
  for (let i = startIndex; i < ctx.history.length; i++) {
    const entry = ctx.history[i]
    if (!entry) {
      continue
    }
    entry.status = 'pending'
    entry.startedAt = undefined
    entry.completedAt = undefined
    entry.duration = undefined
    entry.error = undefined
    entry.retries = 0
  }
}

/**
 * Handles the final result of a workflow execution, including potential rollbacks.
 */
export async function handleExecutionResult<TInput, TData extends Record<string, any>>(
  definition: WorkflowDefinition<TInput, TData>,
  ctx: WorkflowContext<TInput, TData>,
  result: FluxResult<TData>,
  contextManager: ContextManager,
  rollbackManager: RollbackManager
): Promise<FluxResult<TData>> {
  if (result.status === 'failed' && result.error) {
    const failedIndex = result.history.findIndex((h) => h.status === 'failed')
    if (failedIndex !== -1) {
      const restoredCtx = contextManager.restore({
        ...contextManager.toState(ctx),
        history: result.history,
        data: result.data,
        status: 'failed',
        version: result.version,
      })
      const rolledBackCtx = await rollbackManager.rollback(
        definition,
        restoredCtx,
        failedIndex,
        result.error
      )

      return {
        ...result,
        status: rolledBackCtx.status as any,
        history: rolledBackCtx.history,
        data: rolledBackCtx.data as TData,
      }
    }
  }

  return result
}

/**
 * Persists a workflow context to storage.
 */
export async function persistContext<TInput, TData extends Record<string, any>>(
  ctx: WorkflowContext<TInput, TData>,
  storage: WorkflowStorage,
  contextManager: ContextManager
): Promise<WorkflowContext<TInput, TData>> {
  const state = contextManager.toState(ctx)
  const stored = await storage.load(state.id)
  if (stored && stored.version !== state.version) {
    throw new Errors.FluxError(
      'Concurrent modification detected',
      Errors.FluxErrorCode.CONCURRENT_MODIFICATION
    )
  }
  const nextVersion = state.version + 1
  await storage.save({ ...state, version: nextVersion } as any)
  return updateWorkflowContext(ctx, { version: nextVersion })
}
