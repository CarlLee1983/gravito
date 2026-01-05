export interface PulseCpu {
  system: number // Percentage 0-100
  process: number // Percentage 0-100
  cores: number
}

export interface PulseMemory {
  system: {
    total: number // bytes
    free: number // bytes
    used: number // bytes
  }
  process: {
    rss: number // bytes
    heapTotal: number // bytes
    heapUsed: number // bytes
  }
}

export interface PulseRuntime {
  uptime: number // seconds
  framework: string // e.g. "Node 20.1", "Laravel 10.0"
  status?: string
  errors?: string[]
}

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

export interface PulseNode {
  id: string // Unique Instance ID
  service: string // Group name
  language: 'node' | 'bun' | 'deno' | 'php' | 'go' | 'python' | 'other'
  version: string // App Version
  pid: number
  hostname: string
  platform: string
  cpu: PulseCpu
  memory: PulseMemory
  queues?: QueueSnapshot[]
  runtime: PulseRuntime
  meta?: any // Extra metadata like Laravel workers
  timestamp: number // Last heartbeat
}
export interface AlertRule {
  id: string
  name: string
  type: 'backlog' | 'failure' | 'worker_lost' | 'node_cpu' | 'node_ram'
  threshold: number
  queue?: string // Optional: specific queue or all
  cooldownMinutes: number
}

export interface AlertEvent {
  ruleId: string
  timestamp: number
  message: string
  severity: 'warning' | 'critical'
}

export interface AlertConfig {
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
      to: string // Comma separated list
    }
  }
}

export interface MaintenanceConfig {
  autoCleanup: boolean
  retentionDays: number
  lastRun?: number // Timestamp
}
