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
   * Configure the MongoDB manager.
   *
   * @param config - The configuration object.
   */
  configure(config: MongoManagerConfig): void {
    this.defaultConnection = config.default ?? 'default'

    for (const [name, connectionConfig] of Object.entries(config.connections)) {
      this.configs.set(name, connectionConfig)
    }
  }

  /**
   * Add a connection configuration.
   *
   * @param name - The name of the connection.
   * @param config - The connection configuration.
   */
  addConnection(name: string, config: MongoConfig): void {
    this.configs.set(name, config)
  }

  /**
   * Get a connection by name.
   *
   * @param name - The name of the connection (optional). Defaults to the configured default connection.
   * @returns The MongoClientContract instance.
   * @throws {Error} If the connection is not configured.
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
   * Get the default connection.
   *
   * @returns The default MongoClientContract instance.
   */
  getDefault(): MongoClientContract {
    return this.connection(this.defaultConnection)
  }

  /**
   * Connect all configured connections.
   *
   * @returns A promise that resolves when all connections are established.
   */
  async connectAll(): Promise<void> {
    for (const [name] of this.configs) {
      const client = this.connection(name)
      await client.connect()
    }
  }

  /**
   * Disconnect all connections.
   *
   * @returns A promise that resolves when all connections are closed.
   */
  async disconnectAll(): Promise<void> {
    for (const client of this.connections.values()) {
      await client.disconnect()
    }
    this.connections.clear()
  }

  /**
   * Check if a connection exists.
   *
   * @param name - The name of the connection.
   * @returns True if configured, false otherwise.
   */
  hasConnection(name: string): boolean {
    return this.configs.has(name)
  }

  /**
   * Remove a connection.
   *
   * Disconnects the connection if active and removes its configuration.
   *
   * @param name - The name of the connection.
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
