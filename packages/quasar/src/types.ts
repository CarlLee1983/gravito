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
  driver: 'redis' | 'sqs' | 'rabbitmq'
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

// ============================================
// Phase 3: Remote Control Types
// ============================================

/**
 * Command types that Zenith can send to Quasar agents.
 *
 * @public
 * @since 3.0.0
 */
export type CommandType = 'RETRY_JOB' | 'DELETE_JOB' | 'LARAVEL_ACTION'

/**
 * A command sent from Zenith to a Quasar agent for remote management.
 *
 * @public
 * @since 3.0.0
 */
export interface QuasarCommand {
  /** Unique command ID (UUID). */
  id: string
  /** The type of command to execute. */
  type: CommandType
  /** ID of the target agent (usually hostname + pid). */
  targetNodeId: string
  /** Parameters for the command. */
  payload: {
    /** The target queue name. */
    queue: string
    /** Optional job identifier. */
    jobId?: string
    /** Redis key for the job (for direct access). */
    jobKey?: string
    /** Queue driver type. */
    driver?: 'redis' | 'laravel'
    /** Action specific to the command (e.g., 'retry-all'). */
    action?: string
  }
  /** Epoch timestamp when the command was issued. */
  timestamp: number
  /** The system or user that issued the command. */
  issuer: string
}

/**
 * Result of a command execution on a Quasar agent.
 *
 * @public
 * @since 3.0.0
 */
export interface CommandResult {
  /** The ID of the command this result belongs to. */
  commandId: string
  /** The final status of the command. */
  status: 'success' | 'failed' | 'not_allowed'
  /** Optional error or success message. */
  message?: string
  /** Epoch timestamp when the command finished. */
  timestamp: number
}

/**
 * Interface for handling the execution of remote commands.
 *
 * @public
 * @since 3.0.0
 */
export interface CommandExecutor {
  /** The command type this executor handles. */
  readonly supportedType: CommandType
  /**
   * Execute the given command.
   *
   * @param command - The command to execute.
   * @param redis - Redis client for interacting with queues.
   * @returns The result of the execution.
   */
  execute(command: QuasarCommand, redis: import('ioredis').Redis): Promise<CommandResult>
}
