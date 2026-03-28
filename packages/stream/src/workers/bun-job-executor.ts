/**
 * Bun Worker Execution Script.
 *
 * Runs inside a dedicated Bun Worker Thread. Receives serialized jobs,
 * deserializes them, executes logic, and reports results back to the main thread.
 *
 * Key differences from Node.js version:
 * - Uses `self.onmessage` instead of `parentPort.on()`
 * - Native TypeScript support (no loader needed)
 * - Optimized message passing with fast path for strings
 *
 * @internal
 */

import { StreamError, StreamErrorCodes } from '../errors'
import type { SerializedJob } from '../types'
import { decodeJobFromTransfer } from './BinaryWorkerProtocol'

/**
 * Message sent from Main Thread to Worker.
 *
 * 支援兩種協定：
 * - `execute-binary`：Binary Protocol（ArrayBuffer Transfer，零拷貝，推薦）
 * - `execute`：舊協定（JSON object，向後相容，不在生產環境期望使用）
 * - `shutdown`：優雅關閉 Worker
 */
interface WorkerMessage {
  /**
   * Action type.
   * - `execute-binary`：使用 Binary Protocol 傳遞的 Job（推薦）
   * - `execute`: Run a job（舊協定，保持向後相容）
   * - `shutdown`: Gracefully stop the worker.
   */
  type: 'execute-binary' | 'execute' | 'shutdown'

  /**
   * Binary Protocol：ArrayBuffer 格式的 Job 資料（僅 execute-binary 使用）
   */
  buffer?: ArrayBuffer

  /**
   * 舊協定：Serialized job data（僅 execute 使用）
   */
  job?: SerializedJob

  /**
   * JSON string of class registry (optional).
   */
  classRegistry?: string
}

/**
 * Response sent from Worker to Main Thread.
 */
interface WorkerResponse {
  /**
   * Result status.
   * - `success`: Job completed.
   * - `error`: Job failed.
   * - `ready`: Worker initialized.
   */
  type: 'success' | 'error' | 'ready'

  /**
   * Error message (for `error`).
   */
  error?: string

  /**
   * Error stack trace (for `error`).
   */
  stack?: string
}

type ExecutableJob = Record<string, unknown> & {
  handle: (...args: unknown[]) => unknown | Promise<unknown>
}

type JobClassConstructor = {
  prototype: object
}

type SandboxedJobPayload = Record<string, unknown> & {
  __className?: unknown
  __handleSource?: unknown
  __sandboxedJob?: unknown
}

type ClassRegistry = Record<string, string>

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

/**
 * Registry of known Job classes.
 */
const jobClasses = new Map<string, JobClassConstructor>()

/**
 * Registers a Job class definition.
 *
 * @param name - Class name.
 * @param JobClass - The constructor.
 */
// Reserved for future use in dynamic job registration
// function _registerJobClass(name: string, JobClass: any): void {
//   jobClasses.set(name, JobClass)
// }

/**
 * Deserializes a job from its serialized format.
 *
 * Reconstructs the Job instance based on the serialization type (JSON, Class, etc.).
 *
 * @param serialized - The serialized job data.
 * @returns The instantiated job object.
 * @throws {Error} If deserialization fails or class is unknown.
 */
async function deserializeJob(serialized: SerializedJob): Promise<unknown> {
  if (serialized.type === 'json') {
    const parsed = JSON.parse(serialized.data as string)
    return restoreSandboxedJob(parsed)
  }

  if (serialized.type === 'class') {
    if (!serialized.className) {
      throw new StreamError(500, StreamErrorCodes.SERIALIZATION_MISSING_CLASS_NAME, {
        message: 'Class serialization requires className',
        retryable: false,
      })
    }

    const JobClass = jobClasses.get(serialized.className)
    if (!JobClass) {
      throw new StreamError(500, StreamErrorCodes.SERIALIZATION_CLASS_NOT_REGISTERED, {
        message: `Job class "${serialized.className}" not registered in worker thread`,
        retryable: false,
      })
    }

    const data = JSON.parse(serialized.data as string)
    const instance = Object.create(JobClass.prototype)
    Object.assign(instance, data)

    return instance
  }

  if (serialized.type === 'binary') {
    const { BinarySerializer } = await import('../serializers/BinarySerializer')
    const serializer = new BinarySerializer()
    return serializer.deserialize(serialized)
  }

  if (serialized.type === 'msgpack') {
    const msgpack = await import('@msgpack/msgpack')
    const bytes =
      typeof serialized.data === 'string'
        ? Buffer.from(serialized.data, 'base64')
        : Buffer.from(serialized.data as Uint8Array)
    return msgpack.decode(bytes)
  }

  throw new StreamError(500, StreamErrorCodes.SERIALIZATION_UNKNOWN_TYPE, {
    message: `Unknown serialization type: ${serialized.type}`,
    retryable: false,
  })
}

function restoreSandboxedJob(value: unknown): unknown {
  if (isSandboxedJobPayload(value)) {
    const job: Record<string, unknown> = { ...value }
    const handleSource = value.__handleSource
    delete job.__sandboxedJob
    delete job.__handleSource
    delete job.__className
    job.handle = compileMethod(handleSource)
    return job
  }

  return value
}

function compileMethod(source: string): (...args: unknown[]) => unknown {
  const fn = new Function(`return (${source})`)()
  if (typeof fn !== 'function') {
    throw new StreamError(500, StreamErrorCodes.SERIALIZATION_RESTORE_FAILED, {
      message: 'Failed to restore sandboxed job handler',
      retryable: false,
    })
  }
  return fn as (...args: unknown[]) => unknown
}

function isSandboxedJobPayload(value: unknown): value is SandboxedJobPayload & {
  __handleSource: string
  __sandboxedJob: true
} {
  return (
    isRecord(value) && value.__sandboxedJob === true && typeof value.__handleSource === 'string'
  )
}

function isExecutableJob(value: unknown): value is ExecutableJob {
  return isRecord(value) && typeof value.handle === 'function'
}

function parseClassRegistry(serialized: string): ClassRegistry {
  const parsed = JSON.parse(serialized)
  if (!parsed || typeof parsed !== 'object') {
    throw new StreamError(500, StreamErrorCodes.SERIALIZATION_INVALID_REGISTRY, {
      message: 'Invalid class registry payload',
      retryable: false,
    })
  }

  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  )
}

/**
 * Executes a deserialized job.
 *
 * @param serialized - The serialized job data.
 * @throws {Error} If execution fails or `handle()` is missing.
 */
async function executeJob(serialized: SerializedJob): Promise<void> {
  const job = await deserializeJob(serialized)

  if (!isExecutableJob(job)) {
    throw new StreamError(500, StreamErrorCodes.SERIALIZATION_MISSING_HANDLE, {
      message: 'Job must have a handle() method',
      retryable: false,
    })
  }

  await job.handle()
}

/**
 * Main event loop for the Bun worker thread.
 *
 * Uses Web Workers API with Bun extensions.
 */
declare var self: Worker

/**
 * Signal that worker is ready to receive jobs.
 */
self.postMessage({ type: 'ready' } as WorkerResponse)

/**
 * Handle incoming messages from main thread.
 *
 * 支援兩種協定：
 * - execute-binary：Binary Protocol，從 ArrayBuffer 解碼 Job（推薦）
 * - execute：舊協定，直接使用 job 物件（向後相容）
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  if (message.type === 'shutdown') {
    process.exit(0)
  }

  // Binary Protocol：從 ArrayBuffer transfer 解碼 Job（推薦路徑）
  if (message.type === 'execute-binary' && message.buffer) {
    try {
      // 從 ArrayBuffer 解碼 SerializedJob
      const job = decodeJobFromTransfer(message.buffer)

      // Execute the job
      await executeJob(job)

      // Send success response（回應格式保持不變）
      self.postMessage({ type: 'success' } as WorkerResponse)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      self.postMessage({
        type: 'error',
        error: err.message,
        stack: err.stack,
      } as WorkerResponse)
    }
    return
  }

  // 舊協定：直接使用 job 物件（向後相容，不在生產環境期望使用）
  if (message.type === 'execute' && message.job) {
    try {
      // Dynamically register job classes if provided
      if (message.classRegistry) {
        const registry = parseClassRegistry(message.classRegistry)
        for (const [className, path] of Object.entries(registry)) {
          try {
            // In Bun, use dynamic import for ES modules
            const module = await import(path as string)
            const JobClass = module[className] || module.default || module
            jobClasses.set(className, JobClass)
          } catch (err) {
            console.error(
              `[BunWorker] Failed to load job class "${className}" from "${path}":`,
              err
            )
          }
        }
      }

      // Execute the job
      await executeJob(message.job)

      // Send success response
      self.postMessage({ type: 'success' } as WorkerResponse)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      self.postMessage({
        type: 'error',
        error: err.message,
        stack: err.stack,
      } as WorkerResponse)
    }
  }
}
