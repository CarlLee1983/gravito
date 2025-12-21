/**
 * @gravito/dark-matter
 * MongoDB client for Gravito - Bun native, Laravel-style API
 */

// Main exports
export { Mongo } from './Mongo'
export { MongoClient } from './MongoClient'
export { MongoManager } from './MongoManager'
export { MongoAggregateBuilder, MongoQueryBuilder } from './MongoQueryBuilder'

// Type exports
export type {
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
  PipelineStage,
  Projection,
  SortDirection,
  SortSpec,
  UpdateDocument,
  UpdateResult,
} from './types'
