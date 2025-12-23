/**
 * MongoDB Facade
 * @description Static entry point for MongoDB operations (Laravel-style)
 */

import { MongoManager } from './MongoManager'
import type {
  Document,
  MongoClientContract,
  MongoCollectionContract,
  MongoConfig,
  MongoDatabaseContract,
  MongoManagerConfig,
} from './types'

// Singleton manager instance
const manager = new MongoManager()

/**
 * MongoDB Facade
 * Provides static methods for MongoDB operations
 *
 * @example
 * ```typescript
 * import { Mongo } from '@gravito/dark-matter'
 *
 * // Configure
 * Mongo.configure({
 *   default: 'main',
 *   connections: {
 *     main: { uri: 'mongodb://localhost:27017', database: 'myapp' }
 *   }
 * })
 *
 * // Connect
 * await Mongo.connect()
 *
 * // Use
 * const users = await Mongo.collection('users')
 *   .where('status', 'active')
 *   .orderBy('createdAt', 'desc')
 *   .limit(10)
 *   .get()
 * ```
 */
export class Mongo {
  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Configure MongoDB connections.
   *
   * @param config - The MongoDB manager configuration.
   */
  static configure(config: MongoManagerConfig): void {
    manager.configure(config)
  }

  /**
   * Add a named connection.
   *
   * @param name - The name of the connection.
   * @param config - The connection configuration.
   */
  static addConnection(name: string, config: MongoConfig): void {
    manager.addConnection(name, config)
  }

  /**
   * Get a specific connection.
   *
   * @param name - The name of the connection (optional). Defaults to 'default'.
   * @returns The MongoClientContract instance.
   */
  static connection(name?: string): MongoClientContract {
    return manager.connection(name)
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to the default MongoDB server.
   *
   * @returns A promise that resolves when connected.
   */
  static async connect(): Promise<void> {
    await manager.getDefault().connect()
  }

  /**
   * Connect all configured connections.
   *
   * @returns A promise that resolves when all connections are established.
   */
  static async connectAll(): Promise<void> {
    await manager.connectAll()
  }

  /**
   * Disconnect from the default MongoDB server.
   *
   * @returns A promise that resolves when disconnected.
   */
  static async disconnect(): Promise<void> {
    await manager.getDefault().disconnect()
  }

  /**
   * Disconnect all connections.
   *
   * @returns A promise that resolves when all connections are closed.
   */
  static async disconnectAll(): Promise<void> {
    await manager.disconnectAll()
  }

  /**
   * Check if connected to the default server.
   *
   * @returns True if connected, false otherwise.
   */
  static isConnected(): boolean {
    return manager.getDefault().isConnected()
  }

  // ============================================================================
  // Database & Collection Access
  // ============================================================================

  /**
   * Get a database instance from the default connection.
   *
   * @param name - The name of the database (optional). Defaults to the configured database.
   * @returns The MongoDatabaseContract instance.
   */
  static database(name?: string): MongoDatabaseContract {
    return manager.getDefault().database(name)
  }

  /**
   * Get a collection with query builder from the default connection.
   *
   * @param name - The name of the collection.
   * @returns A MongoCollectionContract instance with fluent query builder.
   */
  static collection<T = Document>(name: string): MongoCollectionContract<T> {
    return manager.getDefault().collection<T>(name)
  }
}
