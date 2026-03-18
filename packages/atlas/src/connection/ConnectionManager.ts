/**
 * Connection Manager
 * @description Manages multiple database connections
 */

import { AtlasObservability } from '../observability'
import {
  type AdaptivePoolConfig,
  AdaptivePoolManager,
  DEFAULT_ADAPTIVE_CONFIG,
} from '../pool/AdaptivePoolManager'
import {
  DEFAULT_HEALTH_CHECK_CONFIG,
  type PoolHealthCheckConfig,
  PoolHealthChecker,
} from '../pool/PoolHealthChecker'
import { createDefaultStrategies } from '../pool/PoolStrategy'
import {
  DEFAULT_WARMER_CONFIG,
  PoolWarmer,
  type PoolWarmerConfig,
  type WarmupResult,
} from '../pool/PoolWarmer'
import type {
  AtlasConnectionEntry,
  ConnectionConfig,
  ConnectionContract,
  PoolHealth,
} from '../types'
import { isReadWriteConfig } from '../types'
import { Connection } from './Connection'
import { ReplicaConnectionPool } from './ReplicaConnectionPool'

/**
 * Connection Manager
 *
 * Responsible for managing the lifecycle of database connections.
 * It handles connection pooling (via drivers), lazy initialization,
 * and automatic cleanup of idle connections.
 *
 * Connections are stored in a Map and retrieved by name. If a connection
 * hasn't been initialized, the manager creates it using the provided configuration.
 */
export class ConnectionManager {
  private connections: Map<string, ConnectionContract> = new Map()
  private defaultConnectionName = 'default'
  private lastUsed = new Map<string, number>()
  private cleanupInterval?: ReturnType<typeof setInterval>
  private healthChecker?: PoolHealthChecker
  private warmer?: PoolWarmer
  private adaptiveManager?: AdaptivePoolManager
  /** Replica pools keyed by connection name */
  private replicaPools: Map<string, ReplicaConnectionPool> = new Map()

  private readonly MAX_IDLE_TIME = 1000 * 60 * 10 // 10 minutes
  private readonly CLEANUP_INTERVAL = 1000 * 60 * 5 // Check every 5 minutes

  constructor(private readonly configs: Record<string, AtlasConnectionEntry> = {}) {
    this.startCleanup()
  }

  /**
   * Get a connection instance by name.
   * If the connection is not already initialized, it will be created.
   *
   * @param name - Optional connection name (defaults to 'default').
   * @returns The connection instance.
   * @throws Error if the connection is not configured.
   */
  connection(name?: string): ConnectionContract {
    const connectionName = name ?? this.defaultConnectionName

    // Return existing connection if available
    const existing = this.connections.get(connectionName)
    if (existing) {
      this.lastUsed.set(connectionName, Date.now())
      return existing
    }

    // Create new connection
    const config = this.configs[connectionName]
    if (!config) {
      throw new Error(`Database connection "${connectionName}" is not configured`)
    }

    // ── Read/Write Replica mode ──
    if (isReadWriteConfig(config)) {
      const tracer = AtlasObservability.getTracer()
      const metrics = AtlasObservability.getMetrics()

      // Build write connection
      const writeConn = this._buildConnection(`${connectionName}:write`, {
        ...config.write,
        tracer,
        metrics,
      })

      // Build read replica connections
      const readConns = config.read.map((readCfg, i) =>
        this._buildConnection(`${connectionName}:read:${i}`, { ...readCfg, tracer, metrics })
      )

      const pool = new ReplicaConnectionPool(writeConn, readConns)
      this.replicaPools.set(connectionName, pool)

      // Expose the write connection as the default for this named connection
      // (so transactions and mutations work correctly out of the box)
      this.connections.set(connectionName, writeConn)
      this.lastUsed.set(connectionName, Date.now())
      return writeConn
    }

    // ── Standard single connection mode ──
    const enrichedConfig: ConnectionConfig = {
      ...config,
      tracer: AtlasObservability.getTracer(),
      metrics: AtlasObservability.getMetrics(),
    }

    return this._buildAndRegisterConnection(connectionName, enrichedConfig)
  }

  /**
   * Get the read replica connection for a named connection.
   * Returns the round-robin selected read replica, or the write connection
   * if no replicas are configured.
   *
   * @param name - Connection name (defaults to default)
   */
  readConnection(name?: string): ConnectionContract {
    const connectionName = name ?? this.defaultConnectionName
    // Ensure pool is initialized
    this.connection(connectionName)
    const pool = this.replicaPools.get(connectionName)
    return pool ? pool.getReadConnection() : this.connection(connectionName)
  }

  /**
   * Get the write (primary) connection for a named connection.
   *
   * @param name - Connection name (defaults to default)
   */
  writeConnection(name?: string): ConnectionContract {
    return this.connection(name)
  }

  /**
   * Check whether a given connection has read replicas.
   */
  hasReplicas(name?: string): boolean {
    const connectionName = name ?? this.defaultConnectionName
    return this.replicaPools.has(connectionName)
  }

  /**
   * Build and register a Connection instance, wrapping it in a Proxy.
   * @internal
   */
  private _buildAndRegisterConnection(
    connectionName: string,
    config: ConnectionConfig
  ): ConnectionContract {
    const conn = this._buildConnection(connectionName, config)
    this.connections.set(connectionName, conn)
    this.lastUsed.set(connectionName, Date.now())
    return conn
  }

  /**
   * Build a proxy-wrapped Connection from config without registering.
   * @internal
   */
  private _buildConnection(connectionName: string, config: ConnectionConfig): ConnectionContract {
    const connection = new Connection(connectionName, config)
    const proxy = new Proxy(connection, {
      get(target: Connection, prop: string | symbol) {
        if (prop in target) {
          return Reflect.get(target, prop)
        }
        const driver = target.getDriver()
        if (
          typeof prop === 'string' &&
          driver &&
          typeof (driver as unknown as Record<string, unknown>)[prop] === 'function'
        ) {
          return ((driver as unknown as Record<string, unknown>)[prop] as Function).bind(driver)
        }
        return undefined
      },
    }) as unknown as ConnectionContract
    connection.setProxy(proxy)
    return proxy
  }

  /**
   * Add a connection configuration.
   *
   * @param name - Unique name for the connection.
   * @param config - Connection configuration settings (standard or read/write replica).
   */
  addConnection(name: string, config: AtlasConnectionEntry): void {
    this.configs[name] = config
  }

  /**
   * Set the default connection name.
   *
   * @param name - The name of the default connection.
   */
  setDefaultConnection(name: string): void {
    this.defaultConnectionName = name
  }

  /**
   * Get the default connection name.
   *
   * @returns The default connection name.
   */
  getDefaultConnection(): string {
    return this.defaultConnectionName
  }

  /**
   * Check if a connection configuration exists.
   *
   * @param name - The connection name to check.
   * @returns True if the connection is configured.
   */
  hasConnection(name: string): boolean {
    return this.configs[name] !== undefined
  }

  /**
   * Get all configured connection names.
   *
   * @returns Array of connection names.
   */
  getConnectionNames(): string[] {
    return Object.keys(this.configs)
  }

  /**
   * Get the configuration for a specific connection.
   *
   * @param name - The connection name.
   * @returns The connection configuration or undefined if not found.
   */
  getConfig(name: string): AtlasConnectionEntry | undefined {
    return this.configs[name]
  }

  /**
   * Disconnect all active connections.
   *
   * @returns A promise that resolves when all connections are closed.
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises: Promise<void>[] = []

    for (const connection of this.connections.values()) {
      disconnectPromises.push(connection.disconnect())
    }

    // Also disconnect all replica pools
    for (const pool of this.replicaPools.values()) {
      disconnectPromises.push(pool.disconnectAll())
    }

    await Promise.all(disconnectPromises)
    this.connections.clear()
    this.replicaPools.clear()
  }

  /**
   * Disconnect a specific connection by name.
   *
   * @param name - Optional connection name (defaults to default).
   * @returns A promise that resolves when the connection is closed.
   */
  async disconnect(name?: string): Promise<void> {
    const connectionName = name ?? this.defaultConnectionName
    const connection = this.connections.get(connectionName)

    if (connection) {
      await connection.disconnect()
      this.connections.delete(connectionName)
    }
  }

  /**
   * Purge a connection from the manager's cache.
   * This will NOT disconnect the connection if it's already active.
   *
   * @param name - Optional connection name.
   */
  purge(name?: string): void {
    const connectionName = name ?? this.defaultConnectionName
    this.connections.delete(connectionName)
  }

  /**
   * Reconnect to a connection.
   * This will disconnect the existing connection and create a new one.
   *
   * @param name - Optional connection name.
   * @returns The new connection instance.
   */
  async reconnect(name?: string): Promise<ConnectionContract> {
    await this.disconnect(name)
    return this.connection(name)
  }

  private async cleanupIdleConnections(): Promise<void> {
    const now = Date.now()
    const toRemove: string[] = []

    for (const [name, lastTime] of this.lastUsed.entries()) {
      if (now - lastTime > this.MAX_IDLE_TIME) {
        toRemove.push(name)
      }
    }

    for (const name of toRemove) {
      await this.disconnect(name)
      // Only log in non-test/production? Or use debug log?
      // console.log(`[Atlas] Closed idle connection: ${name}`)
    }
  }

  private startCleanup(): void {
    // Clear existing interval if any
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(() => this.cleanupIdleConnections(), this.CLEANUP_INTERVAL)
    // Unref so it doesn't keep process alive
    if (this.cleanupInterval?.unref) {
      this.cleanupInterval.unref()
    }
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }

  /**
   * Enable connection pool health checking
   */
  enableHealthCheck(config: Partial<PoolHealthCheckConfig> = {}): void {
    this.healthChecker = new PoolHealthChecker(this, {
      ...DEFAULT_HEALTH_CHECK_CONFIG,
      ...config,
    })
    this.healthChecker.start()
  }

  /**
   * Disable connection pool health checking
   */
  disableHealthCheck(): void {
    if (this.healthChecker) {
      this.healthChecker.stop()
      this.healthChecker = undefined
    }
  }

  /**
   * Get connection pool health status
   */
  getHealthStatus(connectionName?: string): PoolHealth | Map<string, PoolHealth> {
    if (!this.healthChecker) {
      throw new Error('Health checker not enabled. Call enableHealthCheck() first.')
    }
    return this.healthChecker.getHealthStatus(connectionName)
  }

  /**
   * Enable connection pool warming
   */
  enableWarmup(config: Partial<PoolWarmerConfig> = {}): void {
    this.warmer = new PoolWarmer(this, {
      ...DEFAULT_WARMER_CONFIG,
      ...config,
    })
  }

  /**
   * Warm up all connection pools
   */
  async warmup(): Promise<WarmupResult | undefined> {
    if (!this.warmer) {
      this.enableWarmup()
    }
    return this.warmer?.warmAll()
  }

  /**
   * Enable adaptive connection pool management
   * Automatically adjusts pool sizes based on load patterns
   */
  enableAdaptive(config: Partial<AdaptivePoolConfig> = {}): void {
    const strategies = createDefaultStrategies()
    const strategy = strategies.hybrid

    this.adaptiveManager = new AdaptivePoolManager(this, strategy, {
      ...DEFAULT_ADAPTIVE_CONFIG,
      ...config,
    })

    this.adaptiveManager.start()
  }

  /**
   * Disable adaptive connection pool management
   */
  disableAdaptive(): void {
    if (this.adaptiveManager) {
      this.adaptiveManager.stop()
      this.adaptiveManager = undefined
    }
  }

  /**
   * Get adaptive pool manager instance (if enabled)
   */
  getAdaptiveManager(): AdaptivePoolManager | undefined {
    return this.adaptiveManager
  }

  /**
   * Shutdown the connection manager.
   * Stops the idle cleanup interval, health checking, adaptive management, and disconnects all connections.
   *
   * @returns A promise that resolves when shutdown is complete.
   */
  async shutdown(): Promise<void> {
    this.stopCleanup()
    this.disableHealthCheck()
    this.disableAdaptive()
    await this.disconnectAll()
  }
}
