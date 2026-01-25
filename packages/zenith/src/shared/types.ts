/**
 * Metrics representing CPU usage for a specific node/process.
 *
 * Used to visualize load distribution and identify CPU-bound workers.
 *
 * @public
 * @since 3.0.0
 */
export interface PulseCpu {
  /** System-wide CPU usage percentage (0-100). */
  system: number
  /** Process-specific CPU usage percentage (0-100). */
  process: number
  /** Number of CPU cores available on the host. */
  cores: number
}

/**
 * Metrics representing memory usage for a specific node/process.
 *
 * Critical for detecting memory leaks and capacity planning.
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
 * Provides context about the environment (Node.js version, platform)
 * and current health status.
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
  /** Last few error messages captured from the process stderr/logs. */
  errors?: string[]
}

/**
 * Statistics snapshot for a specific queue.
 *
 * Represents the state of a queue at a specific point in time, including
 * job counts and throughput metrics. Used for dashboard graphs.
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
  /** Historical throughput data (jobs processed per minute). */
  throughput?: {
    in: number
    out: number
  }
}

/**
 * Represents a single application instance (node) monitored by Zenith.
 *
 * A PulseNode corresponds to a running process (e.g., a worker, API server)
 * that emits heartbeats. These nodes form the cluster topology.
 *
 * @public
 * @since 3.0.0
 */
export interface PulseNode {
  /** Unique execution ID for the node (usually UUID). */
  id: string
  /** Service group name (e.g., "payment-worker", "api-gateway"). */
  service: string
  /** Programming language or runtime type. */
  language: 'node' | 'bun' | 'deno' | 'php' | 'go' | 'python' | 'other'
  /** Application version (from package.json). */
  version: string
  /** Process identifier (PID). */
  pid: number
  /** Hostname of the machine. */
  hostname: string
  /** Operating system platform (darwin, linux, win32). */
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
  /** Epoch timestamp of the last heartbeat received. */
  timestamp: number
}

/**
 * Definition of an alert rule for monitoring health.
 *
 * Alert rules define conditions that trigger notifications, such as
 * high queue backlogs or worker failures.
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
  /** The value that triggers the alert (e.g., > 100 jobs). */
  threshold: number
  /** Optional queue name to scope the rule to. */
  queue?: string
  /** Minutes to wait before re-triggering the alert (debounce). */
  cooldownMinutes: number
}

/**
 * Configuration for alert notification channels.
 *
 * Defines where alerts should be sent when triggered.
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
 * Controls data retention policies and auto-cleanup tasks.
 *
 * @public
 * @since 3.0.0
 */
export interface MaintenanceConfig {
  /** Whether to automatically delete old data. */
  autoCleanup: boolean
  /** Number of days to retain records (logs, metrics). */
  retentionDays: number
  /** Timestamp of the last maintenance run. */
  lastRun?: number
}

/**
 * Represents a historical alert event.
 *
 * Stored in the database/log to track system health history.
 *
 * @public
 * @since 3.0.0
 */
export interface AlertEvent {
  id?: string
  ruleId: string
  ruleName?: string
  type?: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  timestamp: number
  resolved?: boolean
  resolvedAt?: number
}
