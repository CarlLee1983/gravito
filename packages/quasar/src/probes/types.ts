/**
 * Represents a point-in-time state of a message queue.
 *
 * @public
 * @since 3.0.0
 */
export interface QueueSnapshot {
  /** The name of the queue. */
  name: string
  /** The underlying driver used by the queue. */
  driver: 'redis' | 'sqs' | 'rabbitmq' | 'kafka' | 'laravel' | 'bull' | 'bullmq' | 'bee-queue'
  /** Breakdown of job counts by their current state. */
  size: {
    /** Jobs waiting to be processed. */
    waiting: number
    /** Jobs currently being handled by workers. */
    active: number
    /** Jobs that have exhausted retries and failed. */
    failed: number
    /** Jobs scheduled for future execution. */
    delayed: number
  }
  /** Estimated job throughput statistics (if available). */
  throughput?: {
    /** Arrival rate (jobs per minute). */
    in: number
    /** Completion rate (jobs per minute). */
    out: number
  }
}

/**
 * Combined telemetry data for a system node and its monitored queues.
 *
 * @public
 * @since 3.0.0
 */
export interface SystemMetrics {
  /** CPU utilization data. */
  cpu: {
    /** System-wide CPU load (0-100). */
    system: number
    /** Process-specific CPU load (0-100). */
    process: number
    /** Number of logical CPU cores. */
    cores: number
  }
  /** Memory utilization data (in bytes). */
  memory: {
    /** System-wide memory stats. */
    system: {
      total: number
      free: number
      used: number
    }
    /** Process-specific memory heap stats. */
    process: {
      rss: number
      heapTotal: number
      heapUsed: number
    }
  }
  /** Snapshots of any monitored queues on this node. */
  queues?: QueueSnapshot[]
  /** Runtime language environment. */
  language?: 'node' | 'bun' | 'deno' | 'php' | 'go' | 'python' | 'other'
  /** Version of the Quasar agent or application. */
  version?: string
  /** OS Process ID. */
  pid: number
  /** Machine hostname. */
  hostname: string
  /** Operating system platform. */
  platform: string
  /** Process uptime in seconds. */
  uptime: number
}

/**
 * Interface for metric collectors that gather system-level data.
 *
 * @public
 * @since 3.0.0
 */
export interface Probe {
  /**
   * Gather current system and process metrics.
   *
   * @returns Current system metrics.
   */
  getMetrics(): Promise<SystemMetrics> | SystemMetrics
}

/**
 * Interface for queue-specific metric collectors.
 *
 * @public
 * @since 3.0.0
 */
export interface QueueProbe {
  /**
   * Gather a snapshot of the current queue state.
   *
   * @returns A snapshot of the queue.
   */
  getSnapshot(): Promise<QueueSnapshot>
}
