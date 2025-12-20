/**
 * MongoDB Client
 * @description Low-level MongoDB client wrapper
 */

import { type MongoNativeCollection, MongoQueryBuilder } from './MongoQueryBuilder'
import type {
  Document,
  MongoClientContract,
  MongoCollectionContract,
  MongoConfig,
  MongoDatabaseContract,
} from './types'

/**
 * MongoDB Client
 * Provides a type-safe wrapper around the native MongoDB driver
 */
export class MongoClient implements MongoClientContract {
  private client: NativeMongoClient | null = null
  private db: NativeMongoDatabase | null = null
  private connected = false
  private mongodb: MongoDBModule | null = null

  constructor(private readonly config: MongoConfig = {}) {}

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    if (this.connected) return

    this.mongodb = await this.loadMongoDBModule()

    const uri = this.buildConnectionUri()
    const options: MongoClientOptions = {
      maxPoolSize: this.config.maxPoolSize ?? 10,
      minPoolSize: this.config.minPoolSize ?? 1,
    }

    if (this.config.connectTimeoutMS) {
      options.connectTimeoutMS = this.config.connectTimeoutMS
    }
    if (this.config.socketTimeoutMS) {
      options.socketTimeoutMS = this.config.socketTimeoutMS
    }

    this.client = new this.mongodb.MongoClient(uri, options)
    await this.client.connect()

    const dbName = this.config.database ?? 'test'
    this.db = this.client.db(dbName)
    this.connected = true
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.db = null
    }
    this.connected = false
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.client !== null
  }

  /**
   * Get a database instance
   */
  database(name?: string): MongoDatabaseContract {
    const client = this.getClient()
    const db = name ? client.db(name) : this.db!
    return new MongoDatabaseWrapper(db)
  }

  /**
   * Get a collection with query builder
   */
  collection<T = Document>(name: string): MongoCollectionContract<T> {
    const db = this.getDatabase()
    const nativeCollection = db.collection(name)
    return new MongoQueryBuilder<T>(nativeCollection as unknown as MongoNativeCollection, name)
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private buildConnectionUri(): string {
    if (this.config.uri) {
      return this.config.uri
    }

    const host = this.config.host ?? 'localhost'
    const port = this.config.port ?? 27017
    const protocol = this.config.tls ? 'mongodb+srv' : 'mongodb'

    let uri = `${protocol}://`

    if (this.config.username && this.config.password) {
      uri += `${encodeURIComponent(this.config.username)}:${encodeURIComponent(this.config.password)}@`
    }

    uri += `${host}`

    // Don't add port for SRV connections
    if (!this.config.tls) {
      uri += `:${port}`
    }

    if (this.config.database) {
      uri += `/${this.config.database}`
    }

    const params: string[] = []
    if (this.config.authSource) {
      params.push(`authSource=${this.config.authSource}`)
    }
    if (this.config.replicaSet) {
      params.push(`replicaSet=${this.config.replicaSet}`)
    }

    if (params.length > 0) {
      uri += `?${params.join('&')}`
    }

    return uri
  }

  private async loadMongoDBModule(): Promise<MongoDBModule> {
    try {
      // @ts-expect-error - mongodb is an optional peer dependency
      const mongodb = await import('mongodb')
      return mongodb as unknown as MongoDBModule
    } catch {
      throw new Error(
        'MongoDB client requires the "mongodb" package. Please install it: bun add mongodb'
      )
    }
  }

  private getClient(): NativeMongoClient {
    if (!this.client) {
      throw new Error('MongoDB client not connected. Call connect() first.')
    }
    return this.client
  }

  private getDatabase(): NativeMongoDatabase {
    if (!this.db) {
      throw new Error('MongoDB client not connected. Call connect() first.')
    }
    return this.db
  }
}

/**
 * MongoDB Database Wrapper
 */
class MongoDatabaseWrapper implements MongoDatabaseContract {
  constructor(private readonly db: NativeMongoDatabase) {}

  collection<T = Document>(name: string): MongoCollectionContract<T> {
    const nativeCollection = this.db.collection(name)
    return new MongoQueryBuilder<T>(nativeCollection as unknown as MongoNativeCollection, name)
  }

  async listCollections(): Promise<string[]> {
    const collections = await this.db.listCollections().toArray()
    return collections.map((c: { name: string }) => c.name)
  }

  async dropCollection(name: string): Promise<boolean> {
    return await this.db.dropCollection(name)
  }

  async createCollection(name: string): Promise<void> {
    await this.db.createCollection(name)
  }
}

// ============================================================================
// Internal Types for mongodb module
// ============================================================================

interface MongoDBModule {
  MongoClient: new (uri: string, options?: MongoClientOptions) => NativeMongoClient
}

interface MongoClientOptions {
  maxPoolSize?: number
  minPoolSize?: number
  connectTimeoutMS?: number
  socketTimeoutMS?: number
}

// biome-ignore lint/suspicious/noExplicitAny: MongoDB native client has complex types
interface NativeMongoClient extends Record<string, any> {
  connect(): Promise<void>
  close(): Promise<void>
  db(name?: string): NativeMongoDatabase
}

// biome-ignore lint/suspicious/noExplicitAny: MongoDB native database has complex types
interface NativeMongoDatabase extends Record<string, any> {
  collection(name: string): NativeMongoCollection
  listCollections(): { toArray(): Promise<Array<{ name: string }>> }
  dropCollection(name: string): Promise<boolean>
  createCollection(name: string): Promise<void>
}

// biome-ignore lint/suspicious/noExplicitAny: MongoDB native collection has complex types
type NativeMongoCollection = Record<string, any>
