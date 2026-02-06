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
 * Creates and configures a StepExecutor with tracing support.
 *
 * This helper initializes the executor with retry policies and connects it to the trace emitter
 * to record retry attempts.
 *
 * @param config - The engine configuration containing default retry/timeout settings.
 * @param traceEmitter - The emitter for sending trace events.
 * @returns A fully configured StepExecutor instance.
 *
 * @example
 * ```typescript
 * const executor = createStepExecutor(config, traceEmitter);
 * ```
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
 *
 * Allows the engine to accept both `WorkflowBuilder` instances and plain `WorkflowDefinition` objects.
 *
 * @param workflow - The workflow builder or definition object.
 * @returns The compiled WorkflowDefinition.
 *
 * @example
 * ```typescript
 * const def = resolveDefinition(myWorkflowBuilder);
 * ```
 */
export function resolveDefinition<TInput, TData>(
  workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>
): WorkflowDefinition<TInput, TData> {
  return workflow instanceof WorkflowBuilder ? workflow.build() : workflow
}

/**
 * Resolves the starting index for workflow execution.
 *
 * Handles various ways of specifying the start step: by index, by name, or using a fallback.
 *
 * @param definition - The workflow definition containing the steps.
 * @param fromStep - The requested start step (index or name).
 * @param fallback - The fallback index if `fromStep` is undefined.
 * @returns The zero-based index of the step to start from.
 * @throws {FluxError} If the step index is out of bounds or the step name is not found.
 *
 * @example
 * ```typescript
 * const index = resolveStartIndex(def, 'payment-step', 0);
 * ```
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
 *
 * Clears the status and results of steps from the start index onwards, effectively
 * "rewinding" the workflow history for a retry or resume operation.
 *
 * @param ctx - The workflow context to modify.
 * @param startIndex - The index from which to reset history.
 *
 * @example
 * ```typescript
 * resetHistoryFrom(ctx, 2);
 * // Steps 2, 3, ... are now 'pending'
 * ```
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
 * Handles the final result of a workflow execution, triggering rollback if necessary.
 *
 * Checks if the workflow failed and initiates the compensation process via the RollbackManager.
 *
 * @param definition - The workflow definition.
 * @param ctx - The workflow context at the end of execution.
 * @param result - The raw result from the executor.
 * @param contextManager - The context manager for state restoration.
 * @param rollbackManager - The manager responsible for compensation logic.
 * @param storage - Storage adapter to fetch the latest version for optimistic locking.
 * @returns The final processed result, potentially reflecting a 'rolled_back' status.
 *
 * @example
 * ```typescript
 * const finalResult = await handleExecutionResult(def, ctx, rawResult, cm, rm, storage);
 * ```
 */
export async function handleExecutionResult<TInput, TData extends Record<string, any>>(
  definition: WorkflowDefinition<TInput, TData>,
  ctx: WorkflowContext<TInput, TData>,
  result: FluxResult<TData>,
  contextManager: ContextManager,
  rollbackManager: RollbackManager,
  storage: WorkflowStorage
): Promise<FluxResult<TData>> {
  if (result.status === 'failed' && result.error) {
    const failedIndex = result.history.findIndex((h) => h.status === 'failed')
    if (failedIndex !== -1) {
      // Load the latest state from storage to get the correct version
      const latestState = await storage.load(ctx.id)
      const restoredCtx = contextManager.restore({
        ...contextManager.toState(ctx),
        history: result.history,
        data: result.data,
        status: 'failed',
        version: latestState?.version ?? result.version,
      })
      const rolledBackCtx = await rollbackManager.rollback(
        definition,
        restoredCtx,
        failedIndex,
        result.error
      )

      return {
        ...result,
        status: rolledBackCtx.status,
        history: rolledBackCtx.history,
        data: rolledBackCtx.data as TData,
      }
    }
  }

  return result
}

/**
 * Persists a workflow context to storage with optimistic concurrency control.
 *
 * Converts the context to a state object, checks for version conflicts, and saves it.
 *
 * @param ctx - The workflow context to save.
 * @param storage - The storage adapter.
 * @param contextManager - The context manager for serialization.
 * @returns A promise resolving to the updated context with incremented version.
 * @throws {FluxError} If a concurrent modification is detected.
 *
 * @example
 * ```typescript
 * ctx = await persistContext(ctx, storage, cm);
 * ```
 */
export async function persistContext<TInput, TData extends Record<string, any>>(
  ctx: WorkflowContext<TInput, TData>,
  storage: WorkflowStorage,
  contextManager: ContextManager,
  definitionVersion?: string
): Promise<WorkflowContext<TInput, TData>> {
  const state = contextManager.toState(ctx)
  const stored = await storage.load(state.id)
  if (stored && stored.version !== state.version) {
    throw new Errors.FluxError(
      'Concurrent modification detected',
      Errors.FluxErrorCode.CONCURRENT_MODIFICATION
    )
  }
  // Preserve definitionVersion: use explicit value, or keep existing from storage
  if (definitionVersion !== undefined) {
    state.definitionVersion = definitionVersion
  } else if (stored?.definitionVersion) {
    state.definitionVersion = stored.definitionVersion
  }
  const nextVersion = state.version + 1
  await storage.save({ ...state, version: nextVersion })
  const result = updateWorkflowContext(ctx, { version: nextVersion })
  return result
}

export async function acquireEngineLock(config: FluxConfig, workflowId: string) {
  if (!config.lockProvider) {
    return null
  }
  const owner = `node_${Math.random().toString(36).substring(7)}`
  return await config.lockProvider.acquire(workflowId, owner, 30000)
}
