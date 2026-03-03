import type { ConnectionConfig, ConnectionContract } from '../types'
/**
 * Sharding Configuration
 */
export interface ShardingConfig {
  /**
   * Number of shards
   */
  shardCount: number
  /**
   * List of shard connection configurations
   */
  shards: (ConnectionConfig & {
    id: number
  })[]
  /**
   * Sharding algorithm (default: 'consistent-hashing')
   */
  algorithm?: 'consistent-hashing' | 'modulo' | 'range'
}
/**
 * Sharding Manager
 *
 * Manages database sharding, connection routing, and distributed queries.
 * Supports horizontal scaling by partitioning data across multiple database instances.
 */
export declare class ShardingManager {
  private connections
  private shardCount
  private algorithm
  constructor(config: ShardingConfig)
  /**
   * Initialize all shard connections
   */
  private initializeShards
  /**
   * Get a shard connection by distribution key (e.g., userId, tenantId)
   *
   * @param key - The distribution key
   * @returns The connection instance for the calculated shard
   */
  getShard(key: string | number): ConnectionContract
  /**
   * Calculate Shard ID based on the key and selected algorithm
   */
  private calculateShardId
  /**
   * Execute a query across all shards and aggregate the results.
   * Useful for reports, analytics, or global searches.
   *
   * @param callback - The operation to perform on each shard
   * @returns Aggregated results from all shards
   */
  mapReduce<T>(
    callback: (connection: ConnectionContract, shardId: number) => Promise<T[]>
  ): Promise<T[]>
  /**
   * Get all active shard connections
   */
  getAllShards(): Map<number, ConnectionContract>
}
