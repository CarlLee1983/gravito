import { DB } from '../DB'
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
  shards: (ConnectionConfig & { id: number })[]
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
export class ShardingManager {
  private connections = new Map<number, ConnectionContract>()
  private shardCount: number
  private algorithm: string

  constructor(config: ShardingConfig) {
    this.shardCount = config.shardCount
    this.algorithm = config.algorithm || 'consistent-hashing'
    this.initializeShards(config.shards)
  }

  /**
   * Initialize all shard connections
   */
  private initializeShards(shards: (ConnectionConfig & { id: number })[]): void {
    for (const shard of shards) {
      const connectionName = `shard_${shard.id}`

      // Register connection with Atlas DB facade
      if (!DB.hasConnection(connectionName)) {
        DB.addConnection(connectionName, shard)
      }

      // Store reference
      this.connections.set(shard.id, DB.connection(connectionName))
    }
  }

  /**
   * Get a shard connection by distribution key (e.g., userId, tenantId)
   *
   * @param key - The distribution key
   * @returns The connection instance for the calculated shard
   */
  getShard(key: string | number): ConnectionContract {
    const shardId = this.calculateShardId(key)
    const connection = this.connections.get(shardId)

    if (!connection) {
      throw new Error(`Shard ${shardId} not configured or unavailable for key "${key}"`)
    }

    return connection
  }

  /**
   * Calculate Shard ID based on the key and selected algorithm
   */
  private calculateShardId(key: string | number): number {
    const stringKey = String(key)

    if (this.algorithm === 'modulo') {
      // Simple modulo for numeric keys
      if (typeof key === 'number') {
        return key % this.shardCount
      }
      // Sum char codes for string keys (simple fallback)
      let sum = 0
      for (let i = 0; i < stringKey.length; i++) {
        sum += stringKey.charCodeAt(i)
      }
      return sum % this.shardCount
    }

    // Default: Consistent Hashing (FNV-1a)
    // Good distribution and low collision
    let hash = 2166136261
    for (let i = 0; i < stringKey.length; i++) {
      hash ^= stringKey.charCodeAt(i)
      hash = (hash * 16777619) >>> 0
    }
    return hash % this.shardCount
  }

  /**
   * Execute a query across all shards and aggregate the results.
   * Useful for reports, analytics, or global searches.
   *
   * @param callback - The operation to perform on each shard
   * @returns Aggregated results from all shards
   */
  async mapReduce<T>(
    callback: (connection: ConnectionContract, shardId: number) => Promise<T[]>
  ): Promise<T[]> {
    const promises: Promise<T[]>[] = []

    for (const [shardId, connection] of this.connections) {
      promises.push(
        callback(connection, shardId).catch((err) => {
          console.error(`[Atlas] Shard ${shardId} mapReduce failed:`, err)
          return []
        })
      )
    }

    const results = await Promise.all(promises)
    return results.flat()
  }

  /**
   * Get all active shard connections
   */
  getAllShards(): Map<number, ConnectionContract> {
    return new Map(this.connections)
  }
}
