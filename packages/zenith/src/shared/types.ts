/**
 * Metrics representing CPU usage for a specific node/process.
 *
 * @public
 * @since 3.0.0
 */
export interface PulseCpu {
  /** System-wide CPU usage percentage (0-100). */
  system: number
  /** Process-specific CPU usage percentage (0-100). */
  process: number
  /** Number of CPU cores available. */
  cores: number
}

/**
 * Metrics representing memory usage for a specific node/process.
 *
 * @public
 * @since 3.0.0
 */
export interface PulseMemory {
  /** System-wide memory statistics. */
  system: {
    /** Total system memory in bytes. */
    total: number
    /** Free system memory in bytes. */
    free: number
    /** Used system memory in bytes. */
    used: number
  }
  /** Process-specific memory statistics. */
  process: {
    /** Resident Set Size (RSS) in bytes. */
    rss: number
    /** Total allocated heap size in bytes. */
    heapTotal: number
    /** Used heap size in bytes. */
    heapUsed: number
  }
}

/**
 * Runtime metadata for a monitored process.
 *
 * @public
 * @since 3.0.0
 */
export interface PulseRuntime {
  /** Uptime in seconds. */
  uptime: number
  /** Framework or runtime identification (e.g., "Node 21.4"). */
  framework: string
  /** Current process status (e.g., 'online', 'maintenance'). */
  status?: string
  /** Last few error messages from the process. */
  errors?: string[]
}

/**
 * Statistics snapshot for a specific queue.
 *
 * @public
 * @since 3.0.0
 */
export interface QueueSnapshot {
  /** The name of the queue. */
  name: string
  /** The driver used (redis, sqs, etc.). */
  driver: 'redis' | 'sqs' | 'rabbitmq'
  /** Current counts of jobs in different states. */
  size: {
    waiting: number
    active: number
    failed: number
    delayed: number
  }
  /** Historical throughput data. */
  throughput?: {
    in: number
    out: number
  }
}

/**
 * Represents a single application instance (node) monitored by Zenith.
 *
 * @public
 * @since 3.0.0
 */
export interface PulseNode {
  /** Unique execution ID for the node. */
  id: string
  /** Service group name. */
  service: string
  /** Programming language or runtime type. */
  language: 'node' | 'bun' | 'deno' | 'php' | 'go' | 'python' | 'other'
  /** Application version. */
  version: string
  /** Process identifier. */
  pid: number
  /** Hostname of the machine. */
  hostname: string
  /** Operating system platform. */
  platform: string
  /** CPU metrics. */
  cpu: PulseCpu
  /** Memory metrics. */
  memory: PulseMemory
  /** Optional list of queues managed by this node. */
  queues?: QueueSnapshot[]
  /** Runtime details. */
  runtime: PulseRuntime
  /** Unstructured metadata (e.g., framework-specific details). */
  meta?: any
  /** Epoch timestamp of the last heartbeat. */
  timestamp: number
}

/**
 * Definition of an alert rule for monitoring health.
 *
 * @public
 * @since 3.0.0
 */
export interface AlertRule {
  /** Unique rule ID. */
  id: string
  /** Human-readable name. */
  name: string
  /** The metric type to monitor. */
  type: 'backlog' | 'failure' | 'worker_lost' | 'node_cpu' | 'node_ram'
  /** The value that triggers the alert. */
  threshold: number
  /** Optional queue name (if applicable). */
  queue?: string
  /** Minutes to wait before re-triggering the alert. */
  cooldownMinutes: number
}

/**
 * Configuration for alert notification channels.
 *
 * @public
 * @since 3.0.0
 */
export interface AlertConfig {
  /** Map of enabled notification channels. */
  channels: {
    slack?: {
      enabled: boolean
      webhookUrl: string
    }
    discord?: {
      enabled: boolean
      webhookUrl: string
    }
    email?: {
      enabled: boolean
      smtpHost: string
      smtpPort: number
      smtpUser: string
      smtpPass: string
      from: string
      to: string
    }
  }
}

/**
 * Configuration for automated system maintenance.
 *
 * @public
 * @since 3.0.0
 */
export interface MaintenanceConfig {
  /** Whether to automatically delete old data. */
  autoCleanup: boolean
  /** Number of days to retain records. */
  retentionDays: number
  /** Timestamp of the last maintenance run. */
  lastRun?: number
}
