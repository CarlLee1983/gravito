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

import type { SerializedJob } from '../types'

/**
 * Message sent from Main Thread to Worker.
 */
interface WorkerMessage {
  /**
   * Action type.
   * - `execute`: Run a job.
   * - `shutdown`: Gracefully stop the worker.
   */
  type: 'execute' | 'shutdown'

  /**
   * Serialized job data (required for `execute`).
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

/**
 * Registry of known Job classes.
 */
const jobClasses = new Map<string, any>()

/**
 * Registers a Job class definition.
 *
 * @param name - Class name.
 * @param JobClass - The constructor.
 */
function _registerJobClass(name: string, JobClass: any): void {
  jobClasses.set(name, JobClass)
}

/**
 * Deserializes a job from its serialized format.
 *
 * Reconstructs the Job instance based on the serialization type (JSON, Class, etc.).
 *
 * @param serialized - The serialized job data.
 * @returns The instantiated job object.
 * @throws {Error} If deserialization fails or class is unknown.
 */
function deserializeJob(serialized: SerializedJob): any {
  if (serialized.type === 'json') {
    return JSON.parse(serialized.data)
  }

  if (serialized.type === 'class') {
    if (!serialized.className) {
      throw new Error('Class serialization requires className')
    }

    const JobClass = jobClasses.get(serialized.className)
    if (!JobClass) {
      throw new Error(`Job class "${serialized.className}" not registered in worker thread`)
    }

    const data = JSON.parse(serialized.data)
    const instance = Object.create(JobClass.prototype)
    Object.assign(instance, data)

    return instance
  }

  if (serialized.type === 'msgpack') {
    throw new Error('MessagePack deserialization not yet implemented in worker')
  }

  throw new Error(`Unknown serialization type: ${serialized.type}`)
}

/**
 * Executes a deserialized job.
 *
 * @param serialized - The serialized job data.
 * @throws {Error} If execution fails or `handle()` is missing.
 */
async function executeJob(serialized: SerializedJob): Promise<void> {
  const job = deserializeJob(serialized)

  if (typeof job.handle !== 'function') {
    throw new Error('Job must have a handle() method')
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
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  if (message.type === 'shutdown') {
    process.exit(0)
  }

  if (message.type === 'execute' && message.job) {
    try {
      // Dynamically register job classes if provided
      if (message.classRegistry) {
        const registry = JSON.parse(message.classRegistry)
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
