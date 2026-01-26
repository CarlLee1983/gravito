/**
 * Connection Manager
 * @description Manages multiple database connections
 */

import type { ConnectionConfig, ConnectionContract } from '../types'
import { Connection } from './Connection'

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

  private readonly MAX_IDLE_TIME = 1000 * 60 * 10 // 10 minutes
  private readonly CLEANUP_INTERVAL = 1000 * 60 * 5 // Check every 5 minutes

  constructor(private readonly configs: Record<string, ConnectionConfig> = {}) {
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
    this.connections.set(connectionName, proxy)
    this.lastUsed.set(connectionName, Date.now())

    return proxy
  }

  /**
   * Add a connection configuration.
   *
   * @param name - Unique name for the connection.
   * @param config - Connection configuration settings.
   */
  addConnection(name: string, config: ConnectionConfig): void {
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
  getConfig(name: string): ConnectionConfig | undefined {
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

    await Promise.all(disconnectPromises)
    this.connections.clear()
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
   * Shutdown the connection manager.
   * Stops the idle cleanup interval and disconnects all connections.
   *
   * @returns A promise that resolves when shutdown is complete.
   */
  async shutdown(): Promise<void> {
    this.stopCleanup()
    await this.disconnectAll()
  }
}
