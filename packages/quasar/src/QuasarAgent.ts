import { EventEmitter } from 'events'
import { Redis } from 'ioredis'
import type { EventMapping } from './bridges/GenericBridge'
import { LogBuffer } from './bridges/LogBuffer'
import type { LogMiddleware, QueueBridge } from './bridges/types'
import { CommandListener } from './CommandListener'
import { QUASAR_DEFAULTS, QUASAR_KEYS } from './constants'
import { InternalMetrics, MetricsCollector } from './metrics/InternalMetrics'
import { CorePlugin } from './plugins/CorePlugin'
import { PluginRegistry, type QuasarPlugin } from './plugins/QuasarPlugin'
import { CachedNodeProbe } from './probes/CachedNodeProbe'
import { NodeProbe } from './probes/NodeProbe'
import { QuasarTracing } from './tracing/QuasarTracing'
import type { Probe, QueueProbe } from './types'
import { AdaptiveHeartbeat } from './utils/AdaptiveHeartbeat'
import { BufferPool } from './utils/BufferPool'
import { LeaderElection } from './utils/LeaderElection'
import { LogSampler, type SamplingOptions } from './utils/LogSampler'
import { ConsoleLogger, type Logger, type LogLevel } from './utils/logger'
import { RedisBatcher } from './utils/RedisBatcher'
import { DefaultRedisConnectionManager, type RedisConnectionManager } from './utils/redis'
import {
  CborSerializer,
  JsonSerializer,
  MsgPackSerializer,
  ProtobufSerializer,
  type Serializer,
} from './utils/Serializer'

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
  useMsgPack?: boolean
  useCbor?: boolean
  useProtobuf?: boolean
  useCompression?: boolean
  compressionThreshold?: number

  /**
   * OpenTelemetry tracing options.
   * @since 5.1.0
   */
  tracing?: {
    enabled?: boolean
    /** Custom trace exporter endpoint. */
    endpoint?: string
    /** Sample rate (0.0 to 1.0). */
    sampleRate?: number
  }
  plugins?: QuasarPlugin[]
  sampling?: SamplingOptions
  /**
   * Distributed coordination options.
   * @since 6.0.0
   */
  coordination?: {
    enabled?: boolean
    /** TTL for the leader lock in ms. @default 15000 */
    ttl?: number
    /** Interval to refresh/retry leadership in ms. @default 5000 */
    interval?: number
  }
  /**
   * Security options for hardening the agent.
   * @since 7.0.0
   */
  security?: {
    /** Secret key used for HMAC signing of remote control commands. */
    secret?: string
  }
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
  private events = new EventEmitter()
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
  private transportBatcher?: RedisBatcher
  private serializer: Serializer
  private tracing: QuasarTracing
  private useCompression?: boolean
  private compressionThreshold?: number

  private pluginRegistry: PluginRegistry = new PluginRegistry()
  private plugins: QuasarPlugin[] = []
  private sampler: LogSampler
  private leaderElection?: LeaderElection
  private coordinationOptions?: QuasarOptions['coordination']
  private securityOptions?: QuasarOptions['security']

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

    this.tracing = new QuasarTracing({
      enabled: options.tracing?.enabled,
      serviceName: options.service,
      endpoint: options.tracing?.endpoint,
      sampleRate: options.tracing?.sampleRate,
    })

    this.heartbeat = new AdaptiveHeartbeat(async () => this.tick(), {
      baseInterval: this.interval,
      minInterval: Math.max(1000, this.interval / 2),
      maxInterval: this.interval * 3,
      jitter: 0.1,
      backoffMultiplier: 1.5,
    })

    this.serializer = options.useMsgPack ? new MsgPackSerializer() : new JsonSerializer()
    if (options.useCbor) {
      this.serializer = new CborSerializer()
    }
    if (options.useProtobuf) {
      this.serializer = new ProtobufSerializer()
    }
    this.useCompression = options.useCompression
    this.compressionThreshold = options.compressionThreshold

    this.sampler = new LogSampler(options.sampling)
    this.coordinationOptions = options.coordination
    this.securityOptions = options.security

    BufferPool.prewarm([1024, 2048, 4096, 8192])

    this.use(new CorePlugin())
    if (options.plugins) {
      for (const plugin of options.plugins) {
        this.use(plugin)
      }
    }
  }

  use(plugin: QuasarPlugin): this {
    this.plugins.push(plugin)
    if (plugin.onRegister) {
      plugin.onRegister(this)
    }
    return this
  }

  /**
   * Update the agent configuration at runtime.
   *
   * Allows changing parameters like heartbeat intervals, sampling rates, or security
   * secrets without restarting the agent. Notifies all registered plugins of the change.
   *
   * @param options - Partial options containing fields to update.
   * @since 9.0.0
   *
   * @example
   * ```typescript
   * agent.updateOptions({ interval: 5000, sampling: { threshold: 200 } });
   * ```
   */
  updateOptions(options: Partial<QuasarOptions>): void {
    if (options.interval) {
      this.interval = options.interval
      this.heartbeat.updateInterval(this.interval)
    }

    if (options.sampling) {
      this.sampler = new LogSampler(options.sampling)
      for (const bridge of this.bridges) {
        if (typeof (bridge as any).setSampler === 'function') {
          ;(bridge as any).setSampler(this.sampler)
        }
      }
    }

    if (options.security?.secret) {
      this.securityOptions = { ...this.securityOptions, secret: options.security.secret }
      if (this.commandListener) {
        ;(this.commandListener as any).secret = options.security.secret
      }
    }

    for (const plugin of this.plugins) {
      if (plugin.onConfigUpdate) {
        plugin.onConfigUpdate(this, options)
      }
    }

    this.logger.info('[Quasar] Agent configuration updated')
  }

  getPluginRegistry(): PluginRegistry {
    return this.pluginRegistry
  }

  on(event: string, handler: (...args: any[]) => void): this {
    this.events.on(event, handler)
    return this
  }

  emit(event: string, ...args: any[]): boolean {
    return this.events.emit(event, ...args)
  }

  getEmitter(): EventEmitter {
    return this.events
  }

  /**
   * Get the current node ID.
   * Only available after first tick.
   */
  getNodeId(): string | undefined {
    return this.nodeId
  }

  /**
   * Returns true if this node is currently the cluster leader.
   */
  isLeader(): boolean {
    return this.leaderElection?.isLeader() || false
  }

  /**
   * Returns true if distributed coordination is enabled.
   */
  isCoordinationEnabled(): boolean {
    return !!this.leaderElection
  }

  /**
   * Get the current status of all nodes in the cluster for this service.
   * Only returns full data if this node is the leader or has access to all node keys.
   */
  async getClusterStatus(): Promise<any[]> {
    const redis = this.transportRedis
    const prefix = `${this.prefix}${this.service}:*`
    const keys = await redis.keys(prefix)

    if (keys.length === 0) return []

    const values = await redis.mget(...keys)
    return values
      .filter((v): v is string => v !== null)
      .map((v) => {
        try {
          return this.serializer.deserialize(v)
        } catch (err) {
          this.logger.error('[Quasar] Failed to deserialize node status', err)
          return null
        }
      })
      .filter((v) => v !== null)
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

    await Promise.all(
      this.plugins.map((plugin) => (plugin.onStart ? plugin.onStart(this) : Promise.resolve()))
    )

    this.transportBatcher = new RedisBatcher(this.transportRedis, {
      maxBatchSize: 10,
      flushInterval: 500,
      serializer: this.serializer,
    })

    this.logger.info(`[Quasar] Agent started for service: ${this.service}`)

    // Calculate node ID early
    const metrics = await this.probe.getMetrics()
    this.nodeId = `${this.name || metrics.hostname}-${metrics.pid}`

    if (this.coordinationOptions?.enabled) {
      this.leaderElection = new LeaderElection(
        this.transportRedis,
        {
          service: this.service,
          nodeId: this.nodeId,
          ttl: this.coordinationOptions.ttl,
          interval: this.coordinationOptions.interval,
        },
        this.logger
      )

      this.leaderElection.on('leader', () => this.emit('leader'))
      this.leaderElection.on('follower', () => this.emit('follower'))
      this.leaderElection.start()
    }

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

    if (this.leaderElection) {
      await this.leaderElection.stop()
      this.leaderElection = undefined
    }

    await Promise.all(
      this.plugins.map((plugin) => (plugin.onStop ? plugin.onStop(this) : Promise.resolve()))
    )

    if (this.transportBatcher) {
      await this.transportBatcher.stop()
      this.transportBatcher = undefined
    }

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

  getPrometheusMetrics(): string {
    return this.metricsCollector.toPrometheus()
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

    const probe = this.pluginRegistry.getProbe(type, monitorClient, name)
    if (probe) {
      this.queueProbes.push(probe)
    } else {
      this.logger.warn(`[Quasar] No probe registered for type: ${type}`)
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
    options?: {
      eventMapping?: EventMapping
      queueName?: string
      batchSize?: number
      flushInterval?: number
      middlewares?: LogMiddleware[]
    }
  ): void {
    if (!this.transportRedis) {
      this.logger.warn('[Quasar] Cannot attach bridge: transport connection required')
      return
    }

    const workerId = this.nodeId || `${this.service}-${process.pid}`
    const prefix = QUASAR_KEYS.ZENITH_LOG_PREFIX

    const bridgeOptions = {
      batchSize: options?.batchSize,
      flushInterval: options?.flushInterval,
      useCompression: this.useCompression,
      compressionThreshold: this.compressionThreshold,
      tracing: this.tracing,
      emitter: this.events,
      serializer: this.serializer,
      sampler: this.sampler,
      middlewares: options?.middlewares,
    }

    const bridge = this.pluginRegistry.getBridge(type, this.transportRedis, prefix, workerId, {
      ...bridgeOptions,
      ...options,
    })

    if (bridge) {
      bridge.attach(target)
      this.bridges.push(bridge)
      this.logger.info(`[Quasar] 🔗 Attached ${type} bridge to worker`)
    } else {
      this.logger.warn(`[Quasar] No bridge registered for type: ${type}`)
    }
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
    const redisOptions = transportClient.options as any
    const redisUrl = redisOptions?.host
      ? `redis://${redisOptions.host}:${redisOptions.port || 6379}`
      : QUASAR_DEFAULTS.REDIS_URL

    if (redisOptions?.mock) {
      // If we are using a mock, use the same client (or a compatible mock)
      // For testing, we can use a simpler approach if the client supports duplicating
      this.subscriberRedis = transportClient as any
    } else {
      this.subscriberRedis = new Redis(redisUrl, {
        lazyConnect: true,
      })
    }

    try {
      if (this.subscriberRedis) {
        await this.subscriberRedis.connect()
      }

      this.commandListener = new CommandListener(
        this.subscriberRedis!,
        this.service,
        this.nodeId,
        this.logger,
        this.securityOptions?.secret
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
      const id = this.nodeId!

      if (metrics.cpu?.system !== undefined) {
        if (metrics.cpu.system > 80) {
          this.sampler.updateThreshold(100)
        } else if (metrics.cpu.system < 40) {
          this.sampler.updateThreshold(500)
        }
      }

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
      if (this.transportBatcher) {
        this.transportBatcher.set(key, payload, 'EX', 30)
      } else {
        const serialized = this.serializer.serialize(payload)
        await this.transportRedis.set(key, serialized, 'EX', 30)
      }

      this.emit('tick', payload)
    } catch (err) {
      this.logger.error('[Quasar] Heartbeat failed', err)
    }
  }
}
