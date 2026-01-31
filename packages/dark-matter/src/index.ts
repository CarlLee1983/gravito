/**
 * @gravito/dark-matter
 * MongoDB client for Gravito - Bun native, Laravel-style API
 */

// Main exports
export { Mongo } from './Mongo'
export { MongoClient } from './MongoClient'
export { MongoGridFS } from './MongoGridFS'
export { MongoManager } from './MongoManager'
export { MongoPoolMonitor } from './MongoPoolMetrics'
export { MongoAggregateBuilder, MongoQueryBuilder } from './MongoQueryBuilder'
export { MongoSchemaBuilder, schema } from './MongoSchemaBuilder'

// Type exports
export type {
  BulkWriteOperation,
  BulkWriteResult,
  DeleteResult,
  Document,
  FilterDocument,
  FilterOperator,
  GridFSFile,
  GridFSUploadOptions,
  GridFSUploadProgress,
  InsertManyResult,
  InsertResult,
  LookupOptions,
  MongoAggregateContract,
  MongoClientContract,
  MongoCollectionContract,
  MongoConfig,
  MongoDatabaseContract,
  MongoManagerConfig,
  MongoSession,
  PipelineStage,
  PoolMetrics,
  Projection,
  RetryConfig,
  SchemaValidationOptions,
  SoftDeletableDocument,
  SortDirection,
  SortSpec,
  TransactionOptions,
  UpdateDocument,
  UpdateResult,
} from './types'
