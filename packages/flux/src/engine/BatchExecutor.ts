import type { WorkflowBuilder } from '../builder/WorkflowBuilder'
import type { FluxResult, WorkflowDefinition } from '../types'
import type { FluxEngine } from './FluxEngine'

/**
 * Options for batch execution of workflows.
 */
export interface BatchExecutionOptions {
  /** Maximum concurrent workflow executions. @default 10 */
  concurrency?: number
  /** Whether to continue on individual workflow failures. @default true */
  continueOnError?: boolean
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number, result: BatchItemResult) => void
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

/**
 * Result of a single item in a batch execution.
 */
export interface BatchItemResult<TData = any> {
  /** Index in the batch */
  index: number
  /** Input provided to this workflow */
  input: unknown
  /** Execution result (null if failed before execution) */
  result: FluxResult<TData> | null
  /** Error if failed */
  error?: Error
  /** Whether this item succeeded */
  success: boolean
}

/**
 * Result of a batch execution containing all individual results.
 */
export interface BatchResult<TData = any> {
  /** Total items in batch */
  total: number
  /** Number of successful executions */
  succeeded: number
  /** Number of failed executions */
  failed: number
  /** Results for each item in order */
  results: BatchItemResult<TData>[]
  /** Total execution time in milliseconds */
  duration: number
}

/**
 * Semaphore for controlling concurrent execution.
 * Limits the number of concurrent operations to a specified maximum.
 */
class Semaphore {
  private current = 0
  private queue: Array<() => void> = []

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++
      return
    }
    await new Promise<void>((resolve) => this.queue.push(resolve))
    this.current++
  }

  release(): void {
    this.current--
    const next = this.queue.shift()
    if (next) next()
  }
}

/**
 * Executes workflows in batches with controlled concurrency.
 *
 * BatchExecutor provides efficient parallel execution of multiple workflow instances
 * while respecting concurrency limits, handling errors gracefully, and supporting
 * cancellation via AbortSignal.
 *
 * @example
 * ```typescript
 * const engine = new FluxEngine()
 * const executor = new BatchExecutor(engine)
 *
 * const results = await executor.execute(
 *   myWorkflow,
 *   [{ id: 1 }, { id: 2 }, { id: 3 }],
 *   {
 *     concurrency: 5,
 *     onProgress: (completed, total) => console.log(`${completed}/${total}`)
 *   }
 * )
 *
 * console.log(`Succeeded: ${results.succeeded}, Failed: ${results.failed}`)
 * ```
 */
export class BatchExecutor {
  constructor(private engine: FluxEngine) {}

  /**
   * Execute a workflow for multiple inputs with controlled concurrency.
   *
   * @param workflow - The workflow definition or builder to execute.
   * @param inputs - Array of inputs, one per workflow execution.
   * @param options - Execution options (concurrency, error handling, etc.).
   * @returns Batch result containing all individual execution results.
   */
  async execute<TInput, TData extends Record<string, any> = Record<string, any>>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    inputs: TInput[],
    options?: BatchExecutionOptions
  ): Promise<BatchResult<TData>> {
    const startTime = Date.now()
    const concurrency = options?.concurrency ?? 10
    const continueOnError = options?.continueOnError ?? true
    const semaphore = new Semaphore(concurrency)

    const results: BatchItemResult<TData>[] = new Array(inputs.length)
    let succeeded = 0
    let failed = 0
    let completed = 0
    let shouldStop = false

    const executeOne = async (input: TInput, index: number): Promise<void> => {
      if (options?.signal?.aborted || shouldStop) {
        results[index] = {
          index,
          input,
          result: null,
          error: new Error('Execution aborted'),
          success: false,
        }
        failed++
        return
      }

      await semaphore.acquire()

      try {
        if (options?.signal?.aborted || shouldStop) {
          results[index] = {
            index,
            input,
            result: null,
            error: new Error('Execution aborted'),
            success: false,
          }
          failed++
          return
        }

        const result = await this.engine.execute(
          workflow as
            | WorkflowBuilder<TInput, Record<string, any>>
            | WorkflowDefinition<TInput, Record<string, any>>,
          input
        )
        const success = result.status === 'completed'

        results[index] = {
          index,
          input,
          result: result as FluxResult<TData>,
          error: result.error,
          success,
        }

        if (success) {
          succeeded++
        } else {
          failed++
          if (!continueOnError) {
            shouldStop = true
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        results[index] = {
          index,
          input,
          result: null,
          error: err,
          success: false,
        }
        failed++
        if (!continueOnError) {
          shouldStop = true
        }
      } finally {
        semaphore.release()
        completed++
        options?.onProgress?.(completed, inputs.length, results[index]!)
      }
    }

    await Promise.all(inputs.map((input, index) => executeOne(input, index)))

    return {
      total: inputs.length,
      succeeded,
      failed,
      results,
      duration: Date.now() - startTime,
    }
  }

  /**
   * Execute different workflows in a single batch.
   *
   * Unlike `execute()`, this method allows each item in the batch to use a different
   * workflow definition, enabling heterogeneous batch processing.
   *
   * @param items - Array of workflow/input pairs to execute.
   * @param options - Execution options (concurrency, error handling, etc.).
   * @returns Batch result containing all individual execution results.
   */
  async executeMany<TData = any>(
    items: Array<{ workflow: WorkflowDefinition<any, any>; input: any }>,
    options?: BatchExecutionOptions
  ): Promise<BatchResult<TData>> {
    const startTime = Date.now()
    const concurrency = options?.concurrency ?? 10
    const continueOnError = options?.continueOnError ?? true
    const semaphore = new Semaphore(concurrency)

    const results: BatchItemResult<TData>[] = new Array(items.length)
    let succeeded = 0
    let failed = 0
    let completed = 0
    let shouldStop = false

    const executeOne = async (
      item: { workflow: WorkflowDefinition<any, any>; input: any },
      index: number
    ): Promise<void> => {
      if (options?.signal?.aborted || shouldStop) {
        results[index] = {
          index,
          input: item.input,
          result: null,
          error: new Error('Execution aborted'),
          success: false,
        }
        failed++
        return
      }

      await semaphore.acquire()

      try {
        if (options?.signal?.aborted || shouldStop) {
          results[index] = {
            index,
            input: item.input,
            result: null,
            error: new Error('Execution aborted'),
            success: false,
          }
          failed++
          return
        }

        const result = await this.engine.execute(item.workflow, item.input)
        const success = result.status === 'completed'

        results[index] = {
          index,
          input: item.input,
          result,
          error: result.error,
          success,
        }

        if (success) {
          succeeded++
        } else {
          failed++
          if (!continueOnError) {
            shouldStop = true
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        results[index] = {
          index,
          input: item.input,
          result: null,
          error: err,
          success: false,
        }
        failed++
        if (!continueOnError) {
          shouldStop = true
        }
      } finally {
        semaphore.release()
        completed++
        options?.onProgress?.(completed, items.length, results[index]!)
      }
    }

    await Promise.all(items.map((item, index) => executeOne(item, index)))

    return {
      total: items.length,
      succeeded,
      failed,
      results,
      duration: Date.now() - startTime,
    }
  }
}
