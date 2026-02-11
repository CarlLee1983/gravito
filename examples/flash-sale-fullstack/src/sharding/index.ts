/**
 * Sharding System - Public API
 * 分片系統公開接口
 */

export { ConsistentHash } from './ConsistentHash'
export type {
  PostgresPoolConfig,
  ShardDatabaseConnectionConfig,
  ShardDeploymentMode,
} from './ShardDatabaseConfig'
export { ShardDatabaseConfig } from './ShardDatabaseConfig'
export type {
  PoolStats,
  ShardDatabaseStats,
  ShardHealth,
} from './ShardDatabaseManager'
export { ShardDatabaseManager } from './ShardDatabaseManager'
export { ShardingManager } from './ShardingManager'
export type {
  AggregateQueryResult,
  DatabaseConfig,
  RoutingKey,
  ShardInfo,
  ShardingConfig,
  ShardingEvent,
  ShardingEventType,
  ShardingMetrics,
  ShardQueryResult,
} from './types'
