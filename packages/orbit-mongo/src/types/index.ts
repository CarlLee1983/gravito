/**
 * @gravito/orbit-mongo - Type Definitions
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * MongoDB connection configuration
 */
export interface MongoConfig {
  /** MongoDB connection URI */
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
 * MongoDB manager configuration
 */
export interface MongoManagerConfig {
  /** Default connection name */
  default?: string
  /** Named connections */
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
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
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
  createCollection(name: string): Promise<void>
}

/**
 * Generic document type
 */
export interface Document {
  _id?: string
  [key: string]: unknown
}
