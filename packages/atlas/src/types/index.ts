/**
 * @gravito/atlas - Type Definitions
 * @description Core types for the database query builder and ORM
 *
 * 此檔案為 barrel 匯出檔，將所有類型從子模組重新匯出。
 * 保持與原始公開 API 完全相容。
 */

// 通用工具類型（無依賴）
export type { BooleanOperator, DriverType, JoinType, Operator, OrderDirection } from './common'

// 連線配置類型
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

// 連線配置的函式（非類型，需要 export 而非 export type）
export { isReadWriteConfig } from './connection'

// 查詢建構器類型、結果類型與合約
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

// 驅動、連線、Grammar 及快取合約
export type {
  CacheInterface,
  ConnectionContract,
  DriverContract,
  GrammarContract,
} from './contracts'
