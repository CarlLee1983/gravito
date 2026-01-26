import { Redis } from 'ioredis'
import { AgendaBridge } from './bridges/AgendaBridge'
import { BeeQueueBridge } from './bridges/BeeQueueBridge'
import { BullBridge } from './bridges/BullBridge'
import { BullMQBridge } from './bridges/BullMQBridge'
import { type EventMapping, GenericBridge } from './bridges/GenericBridge'
import type { QueueBridge } from './bridges/types'
import { CommandListener } from './CommandListener'
import { QUASAR_DEFAULTS, QUASAR_KEYS } from './constants'
import { InternalMetrics, MetricsCollector } from './metrics/InternalMetrics'
import { BeeQueueProbe } from './probes/BeeQueueProbe'
import { BullMQProbe } from './probes/BullMQProbe'
import { BullProbe } from './probes/BullProbe'
import { CachedNodeProbe } from './probes/CachedNodeProbe'
import { LaravelProbe } from './probes/LaravelProbe'
import { NodeProbe } from './probes/NodeProbe'
import { RedisListProbe } from './probes/RedisListProbe'
import type { Probe, QueueProbe } from './types'
import { AdaptiveHeartbeat } from './utils/AdaptiveHeartbeat'
import { ConsoleLogger, type Logger, type LogLevel } from './utils/logger'
import { DefaultRedisConnectionManager, type RedisConnectionManager } from './utils/redis'

/**
 * Configuration for a Redis connection used by Quasar.
 *
 * @public
 * @since 3.0.0
 */
export interface RedisConfig {
  /** Redis URL (e.g., 'redis://localhost:6379'). */
  url?: string
  /** Existing Redis client instance (ioredis). */
  client?: Redis
  /** Additional ioredis connection options. */
  options?: any
}

/**
 * Options for initializing the Quasar agent.
 *
 * @public
 * @since 3.0.0
 */
export interface QuasarOptions {
  /** Name of the service being monitored (e.g., 'auth-api'). */
  service: string
  /** Optional human-readable name for this specific node. Defaults to hostname. */
  name?: string

  /** Redis connection used for sending heartbeats and telemetry to Zenith. */
  transport?: RedisConfig
  /** Redis connection used for monitoring local queue data (if different from transport). */
  monitor?: RedisConfig
  /** Shorthand for simple transport URL. */
  redisUrl?: string

  /** Heartbeat interval in milliseconds. @default 10000 */
  interval?: number
  /** Custom metrics probe for gathering system data. */
  probe?: Probe
  /** Custom logger instance. */
  logger?: Logger
  /** Log level for default console logger. @default 'info' */
  logLevel?: LogLevel
}

/**
 * QuasarAgent is the telemetry and remote management agent for the Gravito Ecosystem.
 *
 * It runs as a sidecar or background service within your application, collecting
 * system metrics (CPU, Memory), monitoring message queues (BullMQ, Laravel, etc.),
 * and reporting real-time data back to Zenith. It also supports remote control
 * commands for queue management.
 *
 * @example
 * ```typescript
 * const agent = new QuasarAgent({ service: 'orders-worker' });
 * agent.monitorQueue('default', 'bullmq');
 * await agent.start();
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class QuasarAgent {
  private transportManager: RedisConnectionManager
  private monitorManager?: RedisConnectionManager
  private subscriberRedis?: Redis // Dedicated connection for Pub/Sub
  private commandListener?: CommandListener
  private logger: Logger
  private metricsCollector: MetricsCollector

  private service: string
  private name?: string
  private interval: number
  private probe: Probe
  private queueProbes: QueueProbe[] = []
  private bridges: QueueBridge[] = []
  private heartbeat: AdaptiveHeartbeat
  private prefix = QUASAR_KEYS.NODE_PREFIX

  // Cached node ID (computed on first tick)
  private nodeId?: string

  // Getters for backward compatibility and internal usage
  private get transportRedis(): Redis {
    return this.transportManager.getClient()
  }

  private get monitorRedis(): Redis | undefined {
    return this.monitorManager?.getClient()
  }

  constructor(options: QuasarOptions) {
    this.service = options.service
    this.name = options.name
    this.logger = options.logger || new ConsoleLogger(options.logLevel)
    this.metricsCollector = new MetricsCollector()

    // 1. Setup Transport Manager
    if (options.transport?.client) {
      this.transportManager = new DefaultRedisConnectionManager(
        options.transport.client,
        {},
        this.logger
      )
    } else {
      const url = options.transport?.url || options.redisUrl || QUASAR_DEFAULTS.REDIS_URL
      this.transportManager = new DefaultRedisConnectionManager(
        url,
        options.transport?.options,
        this.logger
      )
    }

    // 2. Setup Monitor Manager
    if (options.monitor) {
      if (options.monitor.client) {
        this.monitorManager = new DefaultRedisConnectionManager(
          options.monitor.client,
          {},
          this.logger
        )
      } else if (options.monitor.url) {
        this.monitorManager = new DefaultRedisConnectionManager(
          options.monitor.url,
          options.monitor.options,
          this.logger
        )
      }
    }

    this.interval = options.interval || QUASAR_DEFAULTS.HEARTBEAT_INTERVAL
    const baseProbe = options.probe || new NodeProbe()
    this.probe = new CachedNodeProbe(baseProbe, {
      cacheTimeout: QUASAR_DEFAULTS.PROBE_CACHE_TIMEOUT,
    })

    this.heartbeat = new AdaptiveHeartbeat(async () => this.tick(), {
      baseInterval: this.interval,
      minInterval: Math.max(1000, this.interval / 2),
      maxInterval: this.interval * 3,
      jitter: 0.1,
      backoffMultiplier: 1.5,
    })
  }

  /**
   * Get the current node ID.
   * Only available after first tick.
   */
  getNodeId(): string | undefined {
    return this.nodeId
  }

  /**
   * Start the Quasar agent.
   * Connects to Redis and begins heartbeat reporting.
   */
  async start() {
    const promises = [this.transportManager.connect()]

    if (this.monitorManager) {
      promises.push(this.monitorManager.connect())
    }

    await Promise.all(promises)

    this.logger.info(`[Quasar] Agent started for service: ${this.service}`)

    this.heartbeat.start()
    // Initial tick
    await this.tick()
  }

  /**
   * Stop the Quasar agent.
   * Disconnects from Redis and stops the heartbeat timer.
   */
  async stop() {
    this.heartbeat.stop()

    // Stop command listener if active
    if (this.commandListener) {
      await this.commandListener.stop()
      this.commandListener = undefined
    }

    try {
      await this.transportManager.close()
      if (this.monitorManager) {
        await this.monitorManager.close()
      }
      if (this.subscriberRedis) {
        await this.subscriberRedis.quit()
        this.subscriberRedis = undefined
      }
    } catch (e) {
      this.logger.error('[Quasar] Error stopping redis connections', e)
    }

    this.logger.info(`[Quasar] Agent stopped`)
  }

  /**
   * Get the current agent status.
   */
  getStatus() {
    return {
      nodeId: this.nodeId,
      service: this.service,
      started: true, // If we are here, we are likely started or instantiated. But we can track isRunning.
      transport: this.transportRedis.status,
      monitor: this.monitorRedis?.status || 'not_configured',
      metrics: this.metricsCollector.getMetrics(),
    }
  }

  /**
   * Register a queue for statistics monitoring.
   *
   * @param name - Name of the queue
   * @param type - Type of the queue system ('redis', 'laravel', 'bull', 'bullmq', 'bee-queue')
   */
  monitorQueue(
    name: string,
    type: 'redis' | 'laravel' | 'bull' | 'bullmq' | 'bee-queue' = 'redis'
  ) {
    const monitorClient = this.monitorRedis
    if (!monitorClient) {
      this.logger.warn('[Quasar] Cannot monitor queue, no monitor connection provided.')
      return
    }

    if (type === 'redis') {
      this.queueProbes.push(new RedisListProbe(monitorClient, name))
    } else if (type === 'laravel') {
      this.queueProbes.push(new LaravelProbe(monitorClient, name))
    } else if (type === 'bull') {
      this.queueProbes.push(new BullProbe(monitorClient, name))
    } else if (type === 'bullmq') {
      this.queueProbes.push(new BullMQProbe(monitorClient, name))
    } else if (type === 'bee-queue') {
      this.queueProbes.push(new BeeQueueProbe(monitorClient, name))
    }
  }

  /**
   * Add a custom queue probe.
   * Useful for probes that require specific configuration (RabbitMQ, SQS, etc).
   *
   * @param probe - Instantiated QueueProbe
   */
  addQueueProbe(probe: QueueProbe) {
    this.queueProbes.push(probe)
  }

  /**
   * Attach a bridge to monitor job lifecycle events.
   * This enables real-time job execution logs and error tracking.
   *
   * @param target - BullMQ Worker, Bee-Queue instance, Bull Queue, or EventEmitter
   * @param type - Queue type ('bullmq', 'bee-queue', 'bull', 'agenda', 'generic')
   * @param options - Additional options for generic bridges
   *
   * @example
   * ```typescript
   * import { Worker } from 'bullmq'
   *
   * const worker = new Worker('emails', async (job) => { ... })
   * agent.attachBridge(worker, 'bullmq')
   * ```
   */
  attachBridge(
    target: any,
    type: 'bullmq' | 'bee-queue' | 'bull' | 'agenda' | 'generic',
    options?: { eventMapping?: EventMapping; queueName?: string }
  ): void {
    if (!this.transportRedis) {
      this.logger.warn('[Quasar] Cannot attach bridge: transport connection required')
      return
    }

    const workerId = this.nodeId || `${this.service}-${process.pid}`
    const prefix = QUASAR_KEYS.ZENITH_LOG_PREFIX

    let bridge: QueueBridge
    if (type === 'bullmq') {
      bridge = new BullMQBridge(this.transportRedis, prefix, workerId)
    } else if (type === 'bee-queue') {
      bridge = new BeeQueueBridge(this.transportRedis, prefix, workerId)
    } else if (type === 'bull') {
      bridge = new BullBridge(this.transportRedis, prefix, workerId)
    } else if (type === 'agenda') {
      bridge = new AgendaBridge(this.transportRedis, prefix, workerId)
    } else if (type === 'generic') {
      if (!options?.eventMapping) {
        this.logger.warn('[Quasar] Generic bridge requires eventMapping option')
        return
      }
      bridge = new GenericBridge(
        this.transportRedis,
        prefix,
        workerId,
        options.eventMapping,
        options.queueName
      )
    } else {
      this.logger.warn(`[Quasar] Unknown bridge type: ${type}`)
      return
    }

    bridge.attach(target)
    this.bridges.push(bridge)
    this.logger.info(`[Quasar] 🔗 Attached ${type} bridge to worker`)
  }

  /**
   * Enable Remote Control feature.
   * Allows Zenith to send commands (RETRY_JOB, DELETE_JOB) to this agent.
   *
   * Prerequisites:
   * - Must call after start() (nodeId is required)
   * - Requires monitorRedis connection for command execution
   *
   * @returns true if successfully enabled, false if prerequisites not met
   */
  async enableRemoteControl(): Promise<boolean> {
    const monitorClient = this.monitorRedis
    if (!monitorClient) {
      this.logger.warn('[Quasar] Cannot enable remote control: monitor connection required')
      return false
    }

    if (!this.nodeId) {
      this.logger.warn('[Quasar] Cannot enable remote control: agent not started (nodeId unknown)')
      return false
    }

    if (this.commandListener) {
      this.logger.warn('[Quasar] Remote control already enabled')
      return true
    }

    const transportClient = this.transportRedis
    const redisUrl = transportClient.options?.host
      ? `redis://${transportClient.options.host}:${transportClient.options.port || 6379}`
      : QUASAR_DEFAULTS.REDIS_URL

    if (transportClient.options?.mock) {
      // If we are using a mock, use the same client (or a compatible mock)
      // For testing, we can use a simpler approach if the client supports duplicating
      this.subscriberRedis = transportClient as any
    } else {
      this.subscriberRedis = new Redis(redisUrl, {
        lazyConnect: true,
      })
    }

    try {
      await this.subscriberRedis.connect()

      this.commandListener = new CommandListener(
        this.subscriberRedis,
        this.service,
        this.nodeId,
        this.logger
      )

      await this.commandListener.start(monitorClient)
      this.logger.info(`[Quasar] 🎮 Remote control enabled for node: ${this.nodeId}`)
      return true
    } catch (err) {
      this.logger.error('[Quasar] Failed to enable remote control', err)
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
      this.logger.error('[Quasar] Heartbeat failed', err)
    }
  }
}
