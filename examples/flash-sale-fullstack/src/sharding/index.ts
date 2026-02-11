/**
 * Sharding System - Public API
 * 分片系統公開接口
 */

export type { CanaryConfig, CanaryMetrics, CanaryPhase } from './CanaryDeployment'
export { CanaryDeployment } from './CanaryDeployment'
export { ConsistentHash } from './ConsistentHash'
export type {
  DeploymentDependency,
  DeploymentVersion,
  RegionDeploymentPlan,
  RegionDeploymentStatus,
  SyncState,
} from './CrossRegionDeploymentManager'
export { CrossRegionDeploymentManager } from './CrossRegionDeploymentManager'
export type {
  MismatchDetail,
  ReconciliationConfig,
  ReconciliationResult,
} from './DataReconciliation'
export { DataReconciliation } from './DataReconciliation'
export type { MigrationConfig, MigrationPhase, MigrationStats } from './MigrationManager'
export { MigrationManager } from './MigrationManager'
export type {
  FailoverPolicy,
  GeoRoutingRule,
  RegionConfig,
  RegionHealth,
  ReplicationStrategy,
} from './MultiRegionManager'
export { MultiRegionManager } from './MultiRegionManager'
export type {
  BaselineReport,
  LoadDistribution,
  PerformanceMetrics,
  PerformanceTestConfig,
  QueryLatencies,
} from './PerformanceBaseline'
export { PerformanceBaseline } from './PerformanceBaseline'
export type { AggregationResult, FilterCriteria } from './QueryAggregator'
export { QueryAggregator } from './QueryAggregator'
export type { RollbackPlan, RollbackPoint, RollbackResult, RollbackStep } from './RollbackManager'
export { RollbackManager } from './RollbackManager'
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
