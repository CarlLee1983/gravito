/**
 * Worker Pool Configuration and Types
 *
 * Defines configuration interfaces and data types for worker pool management.
 *
 * @internal
 */

import type { EventTask } from './types'

/**
 * Task source interface for fetching and acknowledging tasks.
 * Supports integration with external task systems like Bull Queue.
 */
export interface TaskSource {
  /**
   * Fetch the next task from the source.
   * Returns null if no tasks available.
   */
  fetchTask(): Promise<EventTask | null>

  /**
   * Acknowledge successful task completion.
   */
  acknowledgeCompletion(taskId: string): Promise<void>

  /**
   * Acknowledge task failure.
   */
  acknowledgeFailure(taskId: string, error: Error): Promise<void>
}

/**
 * Worker Pool Configuration
 */
export interface WorkerPoolConfig {
  /**
   * Maximum number of concurrent tasks being processed.
   * @default 4
   */
  concurrency?: number

  /**
   * Number of worker threads to maintain.
   * @default Number of CPU cores
   */
  workerThreads?: number

  /**
   * Task execution timeout in milliseconds.
   * @default 30000
   */
  taskTimeout?: number

  /**
   * Maximum number of retries for failed tasks.
   * @default 3
   */
  maxRetries?: number

  /**
   * Enable automatic scaling based on load.
   * @default true
   */
  enableAutoScaling?: boolean

  /**
   * Minimum number of workers for auto-scaling.
   * @default 1
   */
  minWorkers?: number

  /**
   * Maximum number of workers for auto-scaling.
   * @default 2 * CPU cores
   */
  maxWorkers?: number

  /**
   * Worker utilization threshold for scaling up (0-1).
   * @default 0.8
   */
  scaleUpThreshold?: number

  /**
   * Worker utilization threshold for scaling down (0-1).
   * @default 0.2
   */
  scaleDownThreshold?: number

  /**
   * Interval for collecting metrics in milliseconds.
   * @default 5000
   */
  metricsInterval?: number

  /**
   * External task source (e.g., Bull Queue).
   * When provided, workers fetch tasks from this source.
   */
  taskSource?: TaskSource
}

/**
 * Worker State
 */
export type WorkerState = 'idle' | 'busy' | 'terminated'

/**
 * Worker Statistics
 */
export interface WorkerStats {
  /**
   * Unique worker identifier.
   */
  id: string

  /**
   * Current worker state.
   */
  state: WorkerState

  /**
   * Total tasks processed by this worker.
   */
  tasksProcessed: number

  /**
   * Total successful tasks.
   */
  tasksSuccess: number

  /**
   * Total failed tasks.
   */
  tasksFailed: number

  /**
   * Average task execution duration in milliseconds.
   */
  avgDurationMs: number

  /**
   * Worker uptime in milliseconds.
   */
  uptime: number
}

/**
 * Worker Pool Statistics
 */
export interface WorkerPoolStats {
  /**
   * Total tasks in queue.
   */
  queueDepth: number

  /**
   * Worker utilization (0-1).
   */
  utilization: number

  /**
   * Current number of active workers.
   */
  activeWorkers: number

  /**
   * Total tasks processed.
   */
  totalTasksProcessed: number

  /**
   * Total successful tasks.
   */
  totalSuccess: number

  /**
   * Total failed tasks.
   */
  totalFailures: number
}
