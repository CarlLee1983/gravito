export interface QueueSnapshot {
  name: string
  driver: 'redis' | 'sqs' | 'rabbitmq'
  size: {
    waiting: number
    active: number
    failed: number
    delayed: number
  }
  throughput?: {
    in: number // jobs/min
    out: number // jobs/min
  }
}

export interface SystemMetrics {
  cpu: {
    system: number // Percentage 0-100
    process: number // Percentage 0-100
    cores: number
  }
  memory: {
    system: {
      total: number
      free: number
      used: number
    }
    process: {
      rss: number
      heapTotal: number
      heapUsed: number
    }
  }
  queues?: QueueSnapshot[]
  language?: 'node' | 'bun' | 'deno' | 'php' | 'go' | 'python' | 'other'
  version?: string
  pid: number
  hostname: string
  platform: string
  uptime: number
}

export interface Probe {
  getMetrics(): Promise<SystemMetrics> | SystemMetrics
}

export interface QueueProbe {
  getSnapshot(): Promise<QueueSnapshot>
}

// ============================================
// Phase 3: Remote Control Types
// ============================================

/**
 * Command types that Zenith can send to Quasar agents.
 * Scope is intentionally limited for security.
 */
export type CommandType = 'RETRY_JOB' | 'DELETE_JOB' | 'LARAVEL_ACTION'

/**
 * A command sent from Zenith to a Quasar agent.
 */
export interface QuasarCommand {
  id: string // Unique command ID (UUID)
  type: CommandType
  targetNodeId: string // Target agent's ID (e.g., "hostname-12345")
  payload: {
    queue: string // Queue name
    jobId?: string // Optional job identifier
    jobKey?: string // Redis key for the job (for direct access)
    driver?: 'redis' | 'laravel' // Queue driver type
    action?: string // For LARAVEL_ACTION (e.g., 'retry-all', 'restart')
  }
  timestamp: number
  issuer: string // Who sent this (e.g., "zenith")
}

/**
 * Result of a command execution (for logging/debugging).
 * Note: We use async state observation, so this is internal only.
 */
export interface CommandResult {
  commandId: string
  status: 'success' | 'failed' | 'not_allowed'
  message?: string
  timestamp: number
}

/**
 * Handler interface for command execution.
 */
export interface CommandExecutor {
  readonly supportedType: CommandType
  execute(command: QuasarCommand, redis: import('ioredis').Redis): Promise<CommandResult>
}
