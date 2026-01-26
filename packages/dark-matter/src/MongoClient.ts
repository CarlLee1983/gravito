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
  RetryConfig,
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
   * Connect to the MongoDB server.
   *
   * Initializes the MongoDB client and establishes a connection.
   *
   * @param retryConfig - Optional retry configuration
   * @returns A promise that resolves when connected.
   */
  async connect(retryConfig?: RetryConfig): Promise<void> {
    if (this.connected) {
      return
    }

    const config: RetryConfig = {
      maxRetries: retryConfig?.maxRetries ?? 3,
      retryDelayMs: retryConfig?.retryDelayMs ?? 1000,
      backoffMultiplier: retryConfig?.backoffMultiplier ?? 2,
    }

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

    let lastError: Error | null = null
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        await this.client.connect()
        const dbName = this.config.database ?? 'test'
        this.db = this.client.db(dbName)
        this.connected = true
        return
      } catch (error) {
        lastError = error as Error
        if (attempt < config.maxRetries) {
          const delay = config.retryDelayMs * config.backoffMultiplier ** attempt
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(
      `Failed to connect to MongoDB after ${config.maxRetries + 1} attempts: ${lastError?.message}`
    )
  }

  /**
   * Disconnect from the MongoDB server.
   *
   * Closes the connection and resets the client state.
   *
   * @returns A promise that resolves when disconnected.
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
   * Check if the client is connected.
   *
   * @returns True if connected, false otherwise.
   */
  isConnected(): boolean {
    return this.connected && this.client !== null
  }

  /**
   * Ensure connection is available, retry if disconnected
   */
  async ensureConnected(): Promise<void> {
    if (!this.connected || !this.client) {
      await this.connect()
      return
    }

    try {
      // Execute ping command to check connection
      await this.db?.command({ ping: 1 })
    } catch {
      // Connection lost, try to reconnect
      this.connected = false
      await this.connect()
    }
  }

  /**
   * Get connection health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean
    latencyMs: number | null
    serverInfo: Record<string, unknown> | null
  }> {
    if (!this.connected || !this.db) {
      return { connected: false, latencyMs: null, serverInfo: null }
    }

    try {
      const start = performance.now()
      const result = await this.db.command({ ping: 1 })
      const latencyMs = performance.now() - start

      return {
        connected: true,
        latencyMs: Math.round(latencyMs * 100) / 100,
        serverInfo: result,
      }
    } catch {
      return { connected: false, latencyMs: null, serverInfo: null }
    }
  }

  /**
   * Get a database instance.
   *
   * @param name - The name of the database (optional). Defaults to the connected database.
   * @returns The MongoDatabaseContract instance.
   */
  database(name?: string): MongoDatabaseContract {
    const client = this.getClient()
    const db = name ? client.db(name) : this.db!
    return new MongoDatabaseWrapper(db)
  }

  /**
   * Get a collection with query builder.
   *
   * @param name - The name of the collection.
   * @returns A MongoCollectionContract instance.
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
