/**
 * ShardingManager
 *
 * 管理資料庫分片，實現基於 userId 的一致性哈希分片策略
 * - 支援 8 個分片
 * - 使用 FNV-1a 哈希算法確保分佈均勻
 * - 提供單分片查詢和跨分片聚合
 */

import type { ConnectionConfig, ConnectionContract } from '@gravito/atlas'
import { DB } from '@gravito/atlas'
import type { Logger } from '@gravito/core'

/**
 * 分片配置（僅支持 PostgreSQL）
 */
export interface PostgreSQLShardConfig {
  id: number
  driver: 'postgresql'
  host: string
  port: number
  database: string
  username?: string
  password?: string
}

export interface ShardingConfig {
  shardCount: number
  shards: PostgreSQLShardConfig[]
}

/**
 * ShardingManager
 *
 * 負責管理多個分片連接和路由邏輯
 */
export class ShardingManager {
  private shardCount: number
  private connections: Map<number, ConnectionContract> = new Map()

  constructor(
    private config: ShardingConfig,
    private logger: Logger
  ) {
    this.shardCount = config.shardCount

    // 初始化所有分片連接
    this.initializeShards()
  }

  /**
   * 初始化所有分片連接
   */
  private initializeShards(): void {
    for (const shardConfig of this.config.shards) {
      const shardId = shardConfig.id
      const connectionName = `shard_${shardId}`

      // 添加分片連接配置到 Atlas
      DB.addConnection(connectionName, {
        driver: 'postgresql',
        host: shardConfig.host,
        port: shardConfig.port,
        database: shardConfig.database,
        username: shardConfig.username,
        password: shardConfig.password,
        pool: {
          min: 2,
          max: 10,
        },
      } as unknown as ConnectionConfig)

      // 獲取連接實例
      const connection = DB.connection(connectionName)
      this.connections.set(shardId, connection)

      this.logger.debug(
        `[ShardingManager] Shard ${shardId} initialized: ${shardConfig.host}:${shardConfig.port}/${shardConfig.database}`
      )
    }
  }

  /**
   * FNV-1a 哈希算法
   *
   * 一致性哈希算法，用於將 userId 映射到分片 ID
   * 具有良好的分佈特性和碰撞風險低
   */
  private hashFunction(key: string): number {
    let hash = 2166136261
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i)
      hash = (hash * 16777619) >>> 0
    }
    return hash
  }

  /**
   * 計算 userId 對應的分片 ID
   *
   * @param userId 用戶 ID
   * @returns 分片 ID（0-7）
   */
  private getShardId(userId: string): number {
    return this.hashFunction(userId) % this.shardCount
  }

  /**
   * 獲取用戶對應的分片連接
   *
   * @param userId 用戶 ID
   * @returns 分片連接
   */
  getShard(userId: string): ConnectionContract {
    const shardId = this.getShardId(userId)
    const connection = this.connections.get(shardId)

    if (!connection) {
      throw new Error(`[ShardingManager] Shard ${shardId} not found for user ${userId}`)
    }

    return connection
  }

  /**
   * 獲取特定分片 ID 的連接
   *
   * @param shardId 分片 ID
   * @returns 分片連接
   */
  getShardById(shardId: number): ConnectionContract {
    const connection = this.connections.get(shardId)

    if (!connection) {
      throw new Error(`[ShardingManager] Shard ${shardId} not found`)
    }

    return connection
  }

  /**
   * 跨分片聚合查詢
   *
   * 用於報表和統計分析，對所有分片執行相同操作並合併結果
   *
   * @param operation 對每個分片執行的操作
   * @returns 所有分片結果的合併
   */
  async aggregateQuery<T>(
    operation: (connection: ConnectionContract, shardId: number) => Promise<T[]>
  ): Promise<T[]> {
    const promises: Promise<T[]>[] = []

    // 為每個分片執行操作
    for (let shardId = 0; shardId < this.shardCount; shardId++) {
      const connection = this.connections.get(shardId)
      if (!connection) {
        continue
      }

      promises.push(
        operation(connection, shardId).catch((error) => {
          this.logger.error(`[ShardingManager] Aggregate query failed on shard ${shardId}:`, error)
          return []
        })
      )
    }

    // 等待所有分片查詢完成
    const results = await Promise.all(promises)

    // 合併結果
    return results.flat()
  }

  /**
   * 獲取所有分片連接
   *
   * @returns 所有分片連接的映射
   */
  getAllShards(): Map<number, ConnectionContract> {
    return new Map(this.connections)
  }

  /**
   * 獲取分片數量
   *
   * @returns 分片數量
   */
  getShardCount(): number {
    return this.shardCount
  }

  /**
   * 斷開所有分片連接
   */
  async disconnectAll(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const connection of this.connections.values()) {
      promises.push(connection.disconnect())
    }

    await Promise.all(promises)
    this.logger.info('[ShardingManager] All shard connections disconnected')
  }
}
