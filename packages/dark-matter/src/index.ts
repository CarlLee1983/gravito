/**
 * @gravito/dark-matter
 * MongoDB client for Gravito - Bun native, Laravel-style API
 */

// Main exports
export { Mongo } from './Mongo'
export { MongoClient } from './MongoClient'
export { MongoManager } from './MongoManager'
export { MongoPoolMonitor } from './MongoPoolMetrics'
export { MongoAggregateBuilder, MongoQueryBuilder } from './MongoQueryBuilder'

// Type exports
export type {
  BulkWriteOperation,
  BulkWriteResult,
  DeleteResult,
  Document,
  FilterDocument,
  FilterOperator,
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
  SortDirection,
  SortSpec,
  TransactionOptions,
  UpdateDocument,
  UpdateResult,
} from './types'
