/**
 * @gravito/dark-matter - Type Definitions
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * MongoDB connection configuration
 */
export interface MongoConfig {
  /**
   * The MongoDB connection URI.
   * If provided, other connection parameters (host, port, etc.) are ignored.
   * @example "mongodb://user:pass@localhost:27017/db"
   */
  uri?: string
  /** Database name */
  database?: string
  /** MongoDB host */
  host?: string
  /** MongoDB port */
  port?: number
  /** Username */
  username?: string
  /** Password */
  password?: string
  /** Authentication database */
  authSource?: string
  /** Replica set name */
  replicaSet?: string
  /** Use TLS */
  tls?: boolean
  /** Connection pool size */
  maxPoolSize?: number
  /** Minimum pool size */
  minPoolSize?: number
  /** Connection timeout in ms */
  connectTimeoutMS?: number
  /** Socket timeout in ms */
  socketTimeoutMS?: number
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  /**
   * Read concern level.
   * - 'local': Data available on current node.
   * - 'majority': Data committed to majority of nodes.
   * - 'linearizable': Linearizable consistency.
   * - 'snapshot': Snapshot isolation (requires read concern 'majority').
   */
  readConcern?: { level: 'local' | 'majority' | 'linearizable' | 'snapshot' }
  /**
   * Write concern options.
   * - w: Number of nodes required to acknowledge write.
   * - j: Whether to wait for journal sync.
   * - wtimeout: Timeout in milliseconds.
   */
  writeConcern?: { w: number | 'majority'; j?: boolean; wtimeout?: number }
  readPreference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest'
}

/**
 * MongoDB session wrapper
 */
export interface MongoSession {
  collection<T = Document>(name: string): MongoCollectionContract<T>
}

/**
 * Retry configuration for connection
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Initial delay between retries in milliseconds */
  retryDelayMs: number
  /** Multiplier for exponential backoff */
  backoffMultiplier: number
}

/**
 * MongoDB manager configuration
 */
export interface MongoManagerConfig {
  /** Default connection name (defaults to 'default' if not specified) */
  default?: string
  /** Named connections map */
  connections: Record<string, MongoConfig>
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * MongoDB filter operators
 */
export type FilterOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'in'
  | 'nin'
  | 'exists'
  | 'regex'

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc' | 1 | -1

/**
 * MongoDB sort specification
 */
export type SortSpec = Record<string, SortDirection>

/**
 * MongoDB projection
 */
export type Projection = Record<string, 0 | 1 | boolean>

/**
 * MongoDB filter document
 */
export type FilterDocument = Record<string, unknown>

/**
 * MongoDB update document
 */
export type UpdateDocument = Record<string, unknown>

/**
 * Aggregation pipeline stage
 */
export type PipelineStage = Record<string, unknown>

// ============================================================================
// Result Types
// ============================================================================

/**
 * Insert result
 */
export interface InsertResult {
  insertedId: string
  acknowledged: boolean
}

/**
 * Insert many result
 */
export interface InsertManyResult {
  insertedIds: string[]
  insertedCount: number
  acknowledged: boolean
}

/**
 * Update result
 */
export interface UpdateResult {
  matchedCount: number
  modifiedCount: number
  acknowledged: boolean
  upsertedId?: string
}

/**
 * Delete result
 */
export interface DeleteResult {
  deletedCount: number
  acknowledged: boolean
}

/**
 * Bulk write operation
 */
export interface BulkWriteOperation<T = Document> {
  insertOne?: { document: Partial<T> }
  updateOne?: { filter: FilterDocument; update: UpdateDocument; upsert?: boolean }
  updateMany?: { filter: FilterDocument; update: UpdateDocument; upsert?: boolean }
  deleteOne?: { filter: FilterDocument }
  deleteMany?: { filter: FilterDocument }
  replaceOne?: { filter: FilterDocument; replacement: Partial<T>; upsert?: boolean }
}

/**
 * Bulk write result
 */
export interface BulkWriteResult {
  insertedCount: number
  matchedCount: number
  modifiedCount: number
  deletedCount: number
  upsertedCount: number
  acknowledged: boolean
}

/**
 * Change stream options
 */
export interface ChangeStreamOptions {
  /**
   * Return full document:
   * - 'default': Only for replace/insert/update
   * - 'updateLookup': Fetch full document for update
   * - 'whenAvailable': If available
   * - 'required': Error if not available
   */
  fullDocument?: 'default' | 'updateLookup' | 'whenAvailable' | 'required'
  /** Resume token to start after */
  resumeAfter?: unknown
  /** Operation time to start at */
  startAtOperationTime?: Date
}

/**
 * Change stream event
 */
export interface ChangeEvent<T = Document> {
  operationType: 'insert' | 'update' | 'replace' | 'delete' | 'invalidate' | 'drop'
  documentKey: { _id: string }
  fullDocument?: T
  updateDescription?: {
    updatedFields: Record<string, unknown>
    removedFields: string[]
  }
  clusterTime: Date
}

/**
 * Schema validation options
 */
export interface SchemaValidationOptions {
  /** JSON Schema validator object */
  validator: Record<string, unknown>
  /** Validation level: 'off', 'strict', or 'moderate' */
  validationLevel?: 'off' | 'strict' | 'moderate'
  /** Validation action: 'error' or 'warn' */
  validationAction?: 'error' | 'warn'
}

/**
 * Schema validation options
 */
export interface SchemaValidationOptions {
  /** JSON Schema validator object */
  validator: Record<string, unknown>
  /** Validation level: 'off', 'strict', or 'moderate' */
  validationLevel?: 'off' | 'strict' | 'moderate'
  /** Validation action: 'error' or 'warn' */
  validationAction?: 'error' | 'warn'
}

/**
 * MongoDB connection pool metrics
 */
export interface PoolMetrics {
  totalConnections: number
  availableConnections: number
  waitQueueSize: number
  currentCheckedOutCount: number
}

/**
 * GridFS upload options
 */
export interface GridFSUploadOptions {
  filename: string
  chunkSizeBytes?: number
  metadata?: Record<string, unknown>
  contentType?: string
}

/**
 * GridFS file metadata
 */
export interface GridFSFile {
  _id: string
  filename: string
  length: number
  chunkSize: number
  uploadDate: Date
  metadata?: Record<string, unknown>
  contentType?: string
}

// ============================================================================
// Contract Interfaces

// ============================================================================

/**
 * MongoDB Collection Contract
 */
export interface MongoCollectionContract<T = Document> {
  // Query building
  where(field: string, value: unknown): this
  where(field: string, operator: FilterOperator, value: unknown): this
  whereIn(field: string, values: unknown[]): this
  whereNotIn(field: string, values: unknown[]): this
  whereNull(field: string): this
  whereNotNull(field: string): this
  whereExists(field: string, exists?: boolean): this
  whereRegex(field: string, pattern: string | RegExp): this
  orWhere(field: string, value: unknown): this
  orWhere(field: string, operator: FilterOperator, value: unknown): this

  // Projection
  select(...fields: string[]): this
  exclude(...fields: string[]): this

  // Sorting
  orderBy(field: string, direction?: SortDirection): this
  latest(field?: string): this
  oldest(field?: string): this

  // Pagination
  limit(count: number): this
  skip(count: number): this
  offset(count: number): this

  // Execution - Read
  get(): Promise<T[]>
  first(): Promise<T | null>
  find(id: string): Promise<T | null>
  count(): Promise<number>
  exists(): Promise<boolean>
  distinct(field: string): Promise<unknown[]>

  // Execution - Write
  insert(document: Partial<T>): Promise<InsertResult>
  insertMany(documents: Partial<T>[]): Promise<InsertManyResult>
  update(update: UpdateDocument): Promise<UpdateResult>
  updateMany(update: UpdateDocument): Promise<UpdateResult>
  delete(): Promise<DeleteResult>
  deleteMany(): Promise<DeleteResult>
  bulkWrite(operations: BulkWriteOperation<T>[]): Promise<BulkWriteResult>
  watch(pipeline?: PipelineStage[], options?: ChangeStreamOptions): AsyncIterable<ChangeEvent<T>>

  // Soft Delete Methods
  /**
   * 包含已軟刪除的記錄
   */
  withTrashed(): this

  /**
   * 只查詢已軟刪除的記錄
   */
  onlyTrashed(): this

  /**
   * 軟刪除單一記錄（設置 deletedAt）
   */
  softDelete(): Promise<UpdateResult>

  /**
   * 批次軟刪除
   */
  softDeleteMany(): Promise<UpdateResult>

  /**
   * 恢復軟刪除的記錄
   */
  restore(): Promise<UpdateResult>

  /**
   * 批次恢復
   */
  restoreMany(): Promise<UpdateResult>

  /**
   * 強制刪除（真正刪除記錄）
   */
  forceDelete(): Promise<DeleteResult>

  /**
   * 批次強制刪除
   */
  forceDeleteMany(): Promise<DeleteResult>

  // Aggregation
  aggregate(): MongoAggregateContract<T>

  // Utilities
  toFilter(): FilterDocument
  clone(): MongoCollectionContract<T>
}

/**
 * MongoDB Aggregation Contract
 */
export interface MongoAggregateContract<T = Document> {
  // Stages
  match(filter: FilterDocument): this
  group(spec: Record<string, unknown>): this
  project(projection: Projection | Record<string, unknown>): this
  sort(spec: SortSpec): this
  limit(count: number): this
  skip(count: number): this
  unwind(field: string | { path: string; preserveNullAndEmptyArrays?: boolean }): this
  lookup(options: LookupOptions): this
  addFields(fields: Record<string, unknown>): this
  count(fieldName: string): this

  // Execution
  get(): Promise<T[]>
  first(): Promise<T | null>

  // Utilities
  toPipeline(): PipelineStage[]
}

/**
 * Lookup options for aggregation
 */
export interface LookupOptions {
  from: string
  localField: string
  foreignField: string
  as: string
}

/**
 * MongoDB Client Contract
 */
export interface MongoClientContract {
  connect(retryConfig?: RetryConfig): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  ensureConnected(): Promise<void>
  getHealthStatus(): Promise<{
    connected: boolean
    latencyMs: number | null
    serverInfo: Record<string, unknown> | null
  }>
  withTransaction<T>(
    callback: (session: MongoSession) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>
  database(name?: string): MongoDatabaseContract
  collection<T = Document>(name: string): MongoCollectionContract<T>
}

/**
 * MongoDB Database Contract
 */
export interface MongoDatabaseContract {
  collection<T = Document>(name: string): MongoCollectionContract<T>
  listCollections(): Promise<string[]>
  dropCollection(name: string): Promise<boolean>
  createCollection(name: string, options?: { schema?: SchemaValidationOptions }): Promise<void>
  setValidation(collectionName: string, schema: SchemaValidationOptions): Promise<void>
}

/**
 * Generic document type
 */
export interface Document {
  _id?: string
  [key: string]: unknown
}

/**
 * 支援軟刪除的文檔類型
 */
export interface SoftDeletableDocument extends Document {
  deletedAt?: Date | null
}
