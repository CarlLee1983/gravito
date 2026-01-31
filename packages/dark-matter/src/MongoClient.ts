/**
 * MongoDB Client
 * @description Low-level MongoDB client wrapper
 */

import { type MongoNativeCollection, MongoQueryBuilder } from './MongoQueryBuilder'
import type { MongoSchemaBuilder } from './MongoSchemaBuilder'
import type {
  Document,
  MongoClientContract,
  MongoCollectionContract,
  MongoConfig,
  MongoDatabaseContract,
  MongoSession,
  RetryConfig,
  SchemaValidationOptions,
  TransactionOptions,
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
   * Establishes a connection to the MongoDB server.
   *
   * Initializes the MongoDB client with the configured options and attempts to connect.
   * Supports exponential backoff for retries if the connection fails.
   *
   * @param retryConfig - Configuration for connection retry behavior (retries, delay, backoff).
   * @returns Promise that resolves when the connection is successfully established.
   * @throws {Error} If connection fails after all retry attempts.
   *
   * @example
   * ```typescript
   * await client.connect({
   *   maxRetries: 5,
   *   retryDelayMs: 500
   * });
   * ```
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
   * Closes the connection to the MongoDB server.
   *
   * Gracefully closes the client connection and resets internal state.
   * Should be called when the application is shutting down.
   *
   * @returns Promise that resolves when the connection is closed.
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
   * Checks if the client is currently connected.
   *
   * @returns `true` if the client is connected and active, `false` otherwise.
   */
  isConnected(): boolean {
    return this.connected && this.client !== null
  }

  /**
   * Verifies connection health and attempts reconnection if needed.
   *
   * Performs a lightweight 'ping' command. If the ping fails or the client
   * is known to be disconnected, it triggers a reconnection attempt.
   *
   * @returns Promise resolving when a connection is confirmed or re-established.
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
   * Retrieves detailed health status of the connection.
   *
   * Measures latency and retrieves server information via a 'ping' command.
   *
   * @returns Object containing connection status, latency in ms, and server info.
   *
   * @example
   * ```typescript
   * const health = await client.getHealthStatus();
   * if (health.connected) {
   *   console.log(`Latency: ${health.latencyMs}ms`);
   * }
   * ```
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
   * Executes a callback within a MongoDB transaction.
   *
   * Manages the session lifecycle, including starting the session, committing the transaction,
   * or aborting it in case of errors.
   *
   * @typeParam T - The return type of the callback.
   * @param callback - The function to execute within the transaction. Receives a session-aware `MongoSession` object.
   * @param options - Transaction configuration options (read/write concern).
   * @returns Promise resolving to the return value of the callback.
   * @throws {Error} If the transaction fails or commits fail.
   *
   * @example
   * ```typescript
   * await client.withTransaction(async (session) => {
   *   await session.collection('accounts').where('id', 'A').update({ $inc: { balance: -100 } });
   *   await session.collection('accounts').where('id', 'B').update({ $inc: { balance: 100 } });
   * });
   * ```
   */
  async withTransaction<T>(
    callback: (session: MongoSession) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    const client = this.getClient()
    const session = client.startSession()

    try {
      let result: T | undefined
      await session.withTransaction(async () => {
        const sessionWrapper: MongoSession = {
          collection: <U = Document>(name: string) => {
            const nativeCollection = this.getDatabase().collection(name)
            return new MongoQueryBuilder<U>(
              nativeCollection as unknown as MongoNativeCollection,
              name,
              session // Pass session to builder
            )
          },
        }
        result = await callback(sessionWrapper)
      }, options)
      return result!
    } finally {
      await session.endSession()
    }
  }

  /**
   * Retrieves a database instance.
   *
   * @param name - Optional database name. Uses the default database from config if omitted.
   * @returns A `MongoDatabaseContract` instance for database-level operations.
   * @throws {Error} If the client is not connected.
   */
  database(name?: string): MongoDatabaseContract {
    const client = this.getClient()
    const db = name ? client.db(name) : this.db!
    return new MongoDatabaseWrapper(db)
  }

  /**
   * Retrieves a collection instance with query builder capabilities.
   *
   * @typeParam T - The type of documents in the collection.
   * @param name - The name of the collection.
   * @returns A `MongoCollectionContract` instance for querying the collection.
   * @throws {Error} If the client is not connected.
   *
   * @example
   * ```typescript
   * const users = client.collection<User>('users');
   * ```
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

  async createCollection(
    name: string,
    options?: { schema?: SchemaValidationOptions }
  ): Promise<void> {
    const createOptions: Record<string, unknown> = {}

    if (options?.schema) {
      createOptions.validator = options.schema.validator
      createOptions.validationLevel = options.schema.validationLevel ?? 'strict'
      createOptions.validationAction = options.schema.validationAction ?? 'error'
    }

    await this.db.createCollection(name, createOptions)
  }

  async setValidation(collectionName: string, schema: SchemaValidationOptions): Promise<void> {
    await this.db.command({
      collMod: collectionName,
      validator: schema.validator,
      validationLevel: schema.validationLevel ?? 'strict',
      validationAction: schema.validationAction ?? 'error',
    })
  }

  /**
   * 使用 Schema Builder 建立 Collection
   *
   * 提供友善的 API 來建立帶有 Schema 驗證的 Collection
   *
   * @param name - Collection 名稱
   * @param schemaBuilder - Schema Builder 實例
   * @param options - 驗證選項（驗證等級、動作）
   *
   * @example
   * ```typescript
   * import { schema } from '@gravito/dark-matter'
   *
   * const userSchema = schema()
   *   .required('name', 'email')
   *   .string('name')
   *   .string('email')
   *
   * await Mongo.database().createCollectionWithSchema('users', userSchema)
   * ```
   */
  async createCollectionWithSchema(
    name: string,
    schemaBuilder: MongoSchemaBuilder,
    options?: {
      validationLevel?: 'off' | 'strict' | 'moderate'
      validationAction?: 'error' | 'warn'
    }
  ): Promise<void> {
    await this.createCollection(name, {
      schema: schemaBuilder.toValidationOptions(options),
    })
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
interface NativeMongoClient {
  connect(): Promise<void>
  close(): Promise<void>
  db(name?: string): NativeMongoDatabase
  startSession(): NativeMongoSession
}

interface NativeMongoSession {
  withTransaction(callback: () => Promise<void>, options?: TransactionOptions): Promise<void>
  endSession(): Promise<void>
}

// biome-ignore lint/suspicious/noExplicitAny: MongoDB native database has complex types
interface NativeMongoDatabase {
  collection(name: string): NativeMongoCollection
  listCollections(): { toArray(): Promise<Array<{ name: string }>> }
  dropCollection(name: string): Promise<boolean>
  createCollection(name: string, options?: Record<string, unknown>): Promise<void>
  command(command: Record<string, unknown>): Promise<Record<string, unknown>>
}

// biome-ignore lint/suspicious/noExplicitAny: MongoDB native collection has complex types
type NativeMongoCollection = MongoNativeCollection
