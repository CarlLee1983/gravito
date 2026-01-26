/**
 * MongoDB Manager
 * @description Manages multiple MongoDB connections
 */

import { MongoClient } from './MongoClient'
import type { MongoClientContract, MongoConfig, MongoManagerConfig } from './types'

/**
 * MongoDB Manager
 * Manages multiple named MongoDB connections
 */
export class MongoManager {
  private connections = new Map<string, MongoClient>()
  private defaultConnection = 'default'
  private configs = new Map<string, MongoConfig>()

  /**
   * Configures the manager with connection settings.
   *
   * @param config - The configuration object defining named connections and default selection.
   *
   * @example
   * ```typescript
   * manager.configure({
   *   default: 'app',
   *   connections: {
   *     app: { uri: 'mongodb://localhost/app' },
   *     logs: { uri: 'mongodb://localhost/logs' }
   *   }
   * });
   * ```
   */
  configure(config: MongoManagerConfig): void {
    this.defaultConnection = config.default ?? 'default'

    for (const [name, connectionConfig] of Object.entries(config.connections)) {
      this.configs.set(name, connectionConfig)
    }
  }

  /**
   * Registers a new named connection configuration.
   *
   * Useful for dynamically adding connections at runtime.
   *
   * @param name - The unique identifier for this connection.
   * @param config - The MongoDB connection options.
   */
  addConnection(name: string, config: MongoConfig): void {
    this.configs.set(name, config)
  }

  /**
   * Retrieves a connection instance by name.
   *
   * If the connection has not been instantiated yet, it will be created lazily
   * based on the stored configuration.
   *
   * @param name - The name of the connection to retrieve. Defaults to the configured default.
   * @returns The requested `MongoClientContract` instance.
   * @throws {Error} If the requested connection name is not configured.
   *
   * @example
   * ```typescript
   * const analyticsDb = manager.connection('analytics');
   * ```
   */
  connection(name?: string): MongoClientContract {
    const connectionName = name ?? this.defaultConnection

    if (!this.connections.has(connectionName)) {
      const config = this.configs.get(connectionName)
      if (!config) {
        throw new Error(`MongoDB connection "${connectionName}" not configured`)
      }
      this.connections.set(connectionName, new MongoClient(config))
    }

    return this.connections.get(connectionName)!
  }

  /**
   * Retrieves the default connection instance.
   *
   * Shortcut for `connection()`.
   *
   * @returns The default `MongoClientContract` instance.
   * @throws {Error} If the default connection is not configured.
   */
  getDefault(): MongoClientContract {
    return this.connection(this.defaultConnection)
  }

  /**
   * Initializes connections for all configured databases.
   *
   * Pre-connects to all defined sources. Useful during application startup warmup.
   *
   * @returns Promise that resolves when all connections are established.
   */
  async connectAll(): Promise<void> {
    for (const [name] of this.configs) {
      const client = this.connection(name)
      await client.connect()
    }
  }

  /**
   * Closes all active connections.
   *
   * Should be called during graceful shutdown to ensure no open handles remain.
   *
   * @returns Promise that resolves when all connections are disconnected.
   */
  async disconnectAll(): Promise<void> {
    for (const client of this.connections.values()) {
      await client.disconnect()
    }
    this.connections.clear()
  }

  /**
   * Verifies if a connection configuration exists.
   *
   * @param name - The connection name to check.
   * @returns `true` if the connection is configured, `false` otherwise.
   */
  hasConnection(name: string): boolean {
    return this.configs.has(name)
  }

  /**
   * Removes and disconnects a named connection.
   *
   * If the connection is currently active, it will be disconnected before removal.
   *
   * @param name - The name of the connection to remove.
   * @returns Promise resolving when the connection is removed.
   */
  async removeConnection(name: string): Promise<void> {
    const client = this.connections.get(name)
    if (client) {
      await client.disconnect()
      this.connections.delete(name)
    }
    this.configs.delete(name)
  }
}
