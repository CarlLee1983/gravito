/**
 * Sharding System - Public API
 * 分片系統公開接口
 */

export { ConsistentHash } from './ConsistentHash'
export type { AggregationResult, FilterCriteria } from './QueryAggregator'
export { QueryAggregator } from './QueryAggregator'
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
export type { AggregateOptions, QueryOptions } from './ShardingDAO'
export { ShardingDAO } from './ShardingDAO'
export { ShardingManager } from './ShardingManager'
export type { ShardContext, ShardRouterOptions } from './ShardRouter'
export { getShardContext, hasShardContext, requireShardContext, ShardRouter } from './ShardRouter'
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
