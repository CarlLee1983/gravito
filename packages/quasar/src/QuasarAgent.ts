import { Redis } from 'ioredis'
import { CommandListener } from './CommandListener'
import { BeeQueueProbe } from './probes/BeeQueueProbe'
import { BullMQProbe } from './probes/BullMQProbe'
import { BullProbe } from './probes/BullProbe'
import { LaravelProbe } from './probes/LaravelProbe'
import { NodeProbe } from './probes/NodeProbe'
import { RedisListProbe } from './probes/RedisListProbe'
import type { Probe, QueueProbe } from './types'

export interface RedisConfig {
  url?: string
  client?: Redis
  options?: any // ioredis options
}

export interface QuasarOptions {
  service: string
  name?: string

  // Connection to Zenith (for Heartbeat/Transport)
  transport?: RedisConfig
  // Connection to Local App (for Queue Monitoring)
  monitor?: RedisConfig
  // Legacy shorthand for transport
  redisUrl?: string

  interval?: number
  probe?: Probe
}

export class QuasarAgent {
  private transportRedis: Redis
  private monitorRedis?: Redis // Optional, only if monitoring queues
  private subscriberRedis?: Redis // Dedicated connection for Pub/Sub
  private commandListener?: CommandListener

  private service: string
  private name?: string
  private interval: number
  private probe: Probe
  private queueProbes: QueueProbe[] = []
  private timer: Timer | null = null
  private prefix = 'gravito:quasar:node:'

  // Cached node ID (computed on first tick)
  private nodeId?: string

  constructor(options: QuasarOptions) {
    this.service = options.service
    this.name = options.name

    // 1. Setup Transport Redis (Priority: transport.client > transport.url > redisUrl > default)
    if (options.transport?.client) {
      this.transportRedis = options.transport.client
    } else {
      const url = options.transport?.url || options.redisUrl || 'redis://localhost:6379'
      this.transportRedis = new Redis(url, {
        lazyConnect: true,
        ...(options.transport?.options || {}),
      })
    }

    // 2. Setup Monitor Redis (if provided)
    if (options.monitor) {
      if (options.monitor.client) {
        this.monitorRedis = options.monitor.client
      } else if (options.monitor.url) {
        this.monitorRedis = new Redis(options.monitor.url, {
          lazyConnect: true,
          ...(options.monitor.options || {}),
        })
      }
    }

    this.interval = options.interval || 10000 // 10s default
    this.probe = options.probe || new NodeProbe()
  }

  /**
   * Get the current node ID.
   * Only available after first tick.
   */
  getNodeId(): string | undefined {
    return this.nodeId
  }

  async start() {
    // Connect transport
    if (this.transportRedis.status !== 'ready' && this.transportRedis.status !== 'connecting') {
      await this.transportRedis.connect()
    }

    // Connect monitor if exists
    if (
      this.monitorRedis &&
      this.monitorRedis.status !== 'ready' &&
      this.monitorRedis.status !== 'connecting'
    ) {
      await this.monitorRedis.connect()
    }

    console.log(`[Quasar] Agent started for service: ${this.service}`)

    this.timer = setInterval(() => this.tick(), this.interval)
    // Initial tick
    await this.tick()
  }

  async stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    // Stop command listener if active
    if (this.commandListener) {
      await this.commandListener.stop()
      this.commandListener = undefined
    }

    try {
      await this.transportRedis.quit()
      if (this.monitorRedis) {
        await this.monitorRedis.quit()
      }
      if (this.subscriberRedis) {
        await this.subscriberRedis.quit()
        this.subscriberRedis = undefined
      }
    } catch (e) {
      console.error('[Quasar] Error stopping redis connections', e)
    }

    console.log(`[Quasar] Agent stopped`)
  }

  monitorQueue(
    name: string,
    type: 'redis' | 'laravel' | 'bull' | 'bullmq' | 'bee-queue' = 'redis'
  ) {
    if (!this.monitorRedis) {
      console.warn('[Quasar] Cannot monitor queue, no monitor connection provided.')
      return
    }

    if (type === 'redis') {
      this.queueProbes.push(new RedisListProbe(this.monitorRedis, name))
    } else if (type === 'laravel') {
      this.queueProbes.push(new LaravelProbe(this.monitorRedis, name))
    } else if (type === 'bull') {
      this.queueProbes.push(new BullProbe(this.monitorRedis, name))
    } else if (type === 'bullmq') {
      this.queueProbes.push(new BullMQProbe(this.monitorRedis, name))
    } else if (type === 'bee-queue') {
      this.queueProbes.push(new BeeQueueProbe(this.monitorRedis, name))
    }
  }

  /**
   * Enable Remote Control feature.
   * Allows Zenith to send commands (RETRY_JOB, DELETE_JOB) to this agent.
   *
   * Prerequisites:
   * - Must call after start() (nodeId is required)
   * - Requires monitor Redis connection for command execution
   *
   * @returns true if successfully enabled, false if prerequisites not met
   */
  async enableRemoteControl(): Promise<boolean> {
    if (!this.monitorRedis) {
      console.warn('[Quasar] Cannot enable remote control: monitor connection required')
      return false
    }

    if (!this.nodeId) {
      console.warn('[Quasar] Cannot enable remote control: agent not started (nodeId unknown)')
      return false
    }

    if (this.commandListener) {
      console.warn('[Quasar] Remote control already enabled')
      return true
    }

    // Create a dedicated subscriber connection (clone from transport)
    // Redis requires a separate connection for SUBSCRIBE
    const redisUrl = this.transportRedis.options?.host
      ? `redis://${this.transportRedis.options.host}:${this.transportRedis.options.port || 6379}`
      : 'redis://localhost:6379'

    this.subscriberRedis = new Redis(redisUrl, {
      lazyConnect: true,
    })

    try {
      await this.subscriberRedis.connect()

      this.commandListener = new CommandListener(this.subscriberRedis, this.service, this.nodeId)

      await this.commandListener.start(this.monitorRedis)
      console.log(`[Quasar] 🎮 Remote control enabled for node: ${this.nodeId}`)
      return true
    } catch (err) {
      console.error('[Quasar] Failed to enable remote control:', err)
      if (this.subscriberRedis) {
        await this.subscriberRedis.quit()
        this.subscriberRedis = undefined
      }
      return false
    }
  }

  private async tick() {
    try {
      const metrics = await this.probe.getMetrics()
      const hostname = this.name || metrics.hostname
      const id = `${hostname}-${metrics.pid}`

      // Cache nodeId for remote control
      this.nodeId = id

      // Collect queue snapshots
      const queues = await Promise.all(this.queueProbes.map((p) => p.getSnapshot()))

      const payload = {
        id,
        service: this.service,
        language: metrics.language || 'node',
        version: metrics.version,
        pid: metrics.pid,
        hostname: hostname,
        platform: metrics.platform,
        cpu: metrics.cpu,
        memory: metrics.memory,
        queues: queues.length > 0 ? queues : undefined,
        runtime: {
          uptime: metrics.uptime,
          framework: 'Quasar',
        },
        timestamp: Date.now(),
      }

      const key = `${this.prefix}${this.service}:${id}`
      await this.transportRedis.set(key, JSON.stringify(payload), 'EX', 30)
    } catch (err) {
      console.error('[Quasar] Heartbeat failed:', err)
    }
  }
}
