/**
 * @gravito/atlas - Type Definitions
 * @description Core types for the database query builder and ORM
 *
 * 此檔案為 barrel 匯出檔，將所有類型從子模組重新匯出。
 * 保持與原始公開 API 完全相容。
 */
export type { BooleanOperator, DriverType, JoinType, Operator, OrderDirection } from './common'
export type {
  AtlasConfig,
  AtlasConnectionEntry,
  AtlasObservabilityConfig,
  BaseConnectionConfig,
  ConnectionConfig,
  MongoDBConfig,
  MySQLConfig,
  PoolConfig,
  PoolHealth,
  PoolStats,
  PostgresConfig,
  ReadWriteConnectionConfig,
  RedisConfig,
  SQLiteConfig,
  SSLConfig,
} from './connection'
export { isReadWriteConfig } from './connection'
export type {
  CacheInterface,
  ConnectionContract,
  DriverContract,
  GrammarContract,
} from './contracts'
export type {
  BatchExecuteResult,
  BatchInsertResult,
  CompiledQuery,
  CursorPaginateResult,
  ExecuteResult,
  Expression,
  FieldInfo,
  HavingClause,
  JoinClause,
  Model,
  ModelConstructor,
  OrderClause,
  PaginateResult,
  QueryBuilderContract,
  QueryResult,
  SafeQueryBuilderContract,
  WhereClause,
} from './query'
