/**
 * Connection Manager
 * @description Manages multiple database connections
 */
import { type AdaptivePoolConfig, AdaptivePoolManager } from '../pool/AdaptivePoolManager'
import { type PoolHealthCheckConfig } from '../pool/PoolHealthChecker'
import { type PoolWarmerConfig } from '../pool/PoolWarmer'
import type { AtlasConnectionEntry, ConnectionContract, PoolHealth } from '../types'
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
export declare class ConnectionManager {
  private readonly configs
  private connections
  private defaultConnectionName
  private lastUsed
  private cleanupInterval?
  private healthChecker?
  private warmer?
  private adaptiveManager?
  /** Replica pools keyed by connection name */
  private replicaPools
  private readonly MAX_IDLE_TIME
  private readonly CLEANUP_INTERVAL
  constructor(configs?: Record<string, AtlasConnectionEntry>)
  /**
   * Get a connection instance by name.
   * If the connection is not already initialized, it will be created.
   *
   * @param name - Optional connection name (defaults to 'default').
   * @returns The connection instance.
   * @throws Error if the connection is not configured.
   */
  connection(name?: string): ConnectionContract
  /**
   * Get the read replica connection for a named connection.
   * Returns the round-robin selected read replica, or the write connection
   * if no replicas are configured.
   *
   * @param name - Connection name (defaults to default)
   */
  readConnection(name?: string): ConnectionContract
  /**
   * Get the write (primary) connection for a named connection.
   *
   * @param name - Connection name (defaults to default)
   */
  writeConnection(name?: string): ConnectionContract
  /**
   * Check whether a given connection has read replicas.
   */
  hasReplicas(name?: string): boolean
  /**
   * Build and register a Connection instance, wrapping it in a Proxy.
   * @internal
   */
  private _buildAndRegisterConnection
  /**
   * Build a proxy-wrapped Connection from config without registering.
   * @internal
   */
  private _buildConnection
  /**
   * Add a connection configuration.
   *
   * @param name - Unique name for the connection.
   * @param config - Connection configuration settings (standard or read/write replica).
   */
  addConnection(name: string, config: AtlasConnectionEntry): void
  /**
   * Set the default connection name.
   *
   * @param name - The name of the default connection.
   */
  setDefaultConnection(name: string): void
  /**
   * Get the default connection name.
   *
   * @returns The default connection name.
   */
  getDefaultConnection(): string
  /**
   * Check if a connection configuration exists.
   *
   * @param name - The connection name to check.
   * @returns True if the connection is configured.
   */
  hasConnection(name: string): boolean
  /**
   * Get all configured connection names.
   *
   * @returns Array of connection names.
   */
  getConnectionNames(): string[]
  /**
   * Get the configuration for a specific connection.
   *
   * @param name - The connection name.
   * @returns The connection configuration or undefined if not found.
   */
  getConfig(name: string): AtlasConnectionEntry | undefined
  /**
   * Disconnect all active connections.
   *
   * @returns A promise that resolves when all connections are closed.
   */
  disconnectAll(): Promise<void>
  /**
   * Disconnect a specific connection by name.
   *
   * @param name - Optional connection name (defaults to default).
   * @returns A promise that resolves when the connection is closed.
   */
  disconnect(name?: string): Promise<void>
  /**
   * Purge a connection from the manager's cache.
   * This will NOT disconnect the connection if it's already active.
   *
   * @param name - Optional connection name.
   */
  purge(name?: string): void
  /**
   * Reconnect to a connection.
   * This will disconnect the existing connection and create a new one.
   *
   * @param name - Optional connection name.
   * @returns The new connection instance.
   */
  reconnect(name?: string): Promise<ConnectionContract>
  private cleanupIdleConnections
  private startCleanup
  stopCleanup(): void
  /**
   * Enable connection pool health checking
   */
  enableHealthCheck(config?: Partial<PoolHealthCheckConfig>): void
  /**
   * Disable connection pool health checking
   */
  disableHealthCheck(): void
  /**
   * Get connection pool health status
   */
  getHealthStatus(connectionName?: string): PoolHealth | Map<string, PoolHealth>
  /**
   * Enable connection pool warming
   */
  enableWarmup(config?: Partial<PoolWarmerConfig>): void
  /**
   * Warm up all connection pools
   */
  warmup(): Promise<any>
  /**
   * Enable adaptive connection pool management
   * Automatically adjusts pool sizes based on load patterns
   */
  enableAdaptive(config?: Partial<AdaptivePoolConfig>): void
  /**
   * Disable adaptive connection pool management
   */
  disableAdaptive(): void
  /**
   * Get adaptive pool manager instance (if enabled)
   */
  getAdaptiveManager(): AdaptivePoolManager | undefined
  /**
   * Shutdown the connection manager.
   * Stops the idle cleanup interval, health checking, adaptive management, and disconnects all connections.
   *
   * @returns A promise that resolves when shutdown is complete.
   */
  shutdown(): Promise<void>
}
