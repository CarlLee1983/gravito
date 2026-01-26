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
  RetryConfig,
} from './types'

// Singleton manager instance
const manager = new MongoManager()

/**
 * MongoDB Facade
 *
 * Provides static methods for MongoDB operations with support for multiple
 * named connections, automated connection management, and a fluent query builder.
 *
 * @example
 * ```typescript
 * import { Mongo } from '@gravito/dark-matter';
 *
 * const users = await Mongo.collection('users')
 *   .where('status', 'active')
 *   .get();
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class Mongo {
  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Configures the global MongoDB connection settings.
   *
   * Sets up the connection manager with named connections and a default.
   *
   * @param config - The configuration object.
   *
   * @example
   * ```typescript
   * Mongo.configure({
   *   default: 'main',
   *   connections: {
   *     main: { uri: 'mongodb://localhost/main' },
   *     analytics: { uri: 'mongodb://localhost/analytics' }
   *   }
   * });
   * ```
   */
  static configure(config: MongoManagerConfig): void {
    manager.configure(config)
  }

  /**
   * Adds a new named connection to the global manager.
   *
   * @param name - Unique name for the connection.
   * @param config - Connection options.
   *
   * @example
   * ```typescript
   * Mongo.addConnection('logs', { uri: 'mongodb://logging-server/logs' });
   * ```
   */
  static addConnection(name: string, config: MongoConfig): void {
    manager.addConnection(name, config)
  }

  /**
   * Retrieves a specific MongoDB connection instance.
   *
   * @param name - Optional connection name. Uses 'default' if omitted.
   * @returns The requested connection instance.
   * @throws {Error} If the connection is not configured.
   *
   * @example
   * ```typescript
   * const logsDb = Mongo.connection('logs');
   * ```
   */
  static connection(name?: string): MongoClientContract {
    return manager.connection(name)
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connects to the default MongoDB server.
   *
   * @param retryConfig - Optional retry policy.
   * @returns Promise resolving when connected.
   */
  static async connect(retryConfig?: RetryConfig): Promise<void> {
    await manager.getDefault().connect(retryConfig)
  }

  /**
   * Establishes connections for all configured databases.
   *
   * @returns Promise resolving when all connections are active.
   */
  static async connectAll(): Promise<void> {
    await manager.connectAll()
  }

  /**
   * Disconnects the default connection.
   *
   * @returns Promise resolving when disconnected.
   */
  static async disconnect(): Promise<void> {
    await manager.getDefault().disconnect()
  }

  /**
   * Disconnects all active connections.
   *
   * @returns Promise resolving when all connections are closed.
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
   * Retrieves a database instance from the default connection.
   *
   * @param name - Optional database name override.
   * @returns A `MongoDatabaseContract` instance.
   */
  static database(name?: string): MongoDatabaseContract {
    return manager.getDefault().database(name)
  }

  /**
   * Creates a query builder for a specific collection on the default connection.
   *
   * @typeParam T - The document type.
   * @param name - The name of the collection.
   * @returns A query builder instance.
   *
   * @example
   * ```typescript
   * const users = await Mongo.collection('users').get();
   * ```
   */
  static collection<T = Document>(name: string): MongoCollectionContract<T> {
    return manager.getDefault().collection<T>(name)
  }
}
