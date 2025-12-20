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
 * import { Mongo } from '@gravito/orbit-mongo'
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
   * Configure MongoDB connections
   */
  static configure(config: MongoManagerConfig): void {
    manager.configure(config)
  }

  /**
   * Add a named connection
   */
  static addConnection(name: string, config: MongoConfig): void {
    manager.addConnection(name, config)
  }

  /**
   * Get a specific connection
   */
  static connection(name?: string): MongoClientContract {
    return manager.connection(name)
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to the default MongoDB server
   */
  static async connect(): Promise<void> {
    await manager.getDefault().connect()
  }

  /**
   * Connect all configured connections
   */
  static async connectAll(): Promise<void> {
    await manager.connectAll()
  }

  /**
   * Disconnect from the default MongoDB server
   */
  static async disconnect(): Promise<void> {
    await manager.getDefault().disconnect()
  }

  /**
   * Disconnect all connections
   */
  static async disconnectAll(): Promise<void> {
    await manager.disconnectAll()
  }

  /**
   * Check if connected
   */
  static isConnected(): boolean {
    return manager.getDefault().isConnected()
  }

  // ============================================================================
  // Database & Collection Access
  // ============================================================================

  /**
   * Get a database instance
   */
  static database(name?: string): MongoDatabaseContract {
    return manager.getDefault().database(name)
  }

  /**
   * Get a collection with query builder
   */
  static collection<T = Document>(name: string): MongoCollectionContract<T> {
    return manager.getDefault().collection<T>(name)
  }
}
