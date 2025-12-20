/**
 * @gravito/orbit-mongo
 * MongoDB client for Gravito - Bun native, Laravel-style API
 */

// Main exports
export { Mongo } from './Mongo'
export { MongoClient } from './MongoClient'
export { MongoManager } from './MongoManager'
export { MongoQueryBuilder, MongoAggregateBuilder } from './MongoQueryBuilder'

// Type exports
export type {
    MongoConfig,
    MongoManagerConfig,
    MongoClientContract,
    MongoDatabaseContract,
    MongoCollectionContract,
    MongoAggregateContract,
    FilterOperator,
    SortDirection,
    SortSpec,
    Projection,
    FilterDocument,
    UpdateDocument,
    PipelineStage,
    InsertResult,
    InsertManyResult,
    UpdateResult,
    DeleteResult,
    LookupOptions,
    Document,
} from './types'
