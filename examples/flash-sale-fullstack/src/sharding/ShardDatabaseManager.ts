/**
 * Shard Database Manager
 * 分片數據庫管理器
 *
 * 職責：
 * 1. 管理 8 個分片的數據庫連接
 * 2. 實現連接池配置
 * 3. 支持虛擬分片（同一數據庫多個 schema）和物理分片
 * 4. 初始化分片 schema 和表
 * 5. 健康檢查和監控
 */

import type { ShardDatabaseConfig, ShardDatabaseConnectionConfig } from './ShardDatabaseConfig'

export interface ShardHealth {
  shardId: number
  isHealthy: boolean
  lastHealthCheck: Date
  error?: string
}

export interface ShardDatabaseStats {
  totalShards: number
  healthyShards: number
  connectionPoolStats: Map<number, PoolStats>
}

export interface PoolStats {
  shardId: number
  activeConnections: number
  idleConnections: number
  totalConnections: number
}

/**
 * 分片數據庫管理器
 */
export class ShardDatabaseManager {
  private config: ShardDatabaseConfig
  private connections: Map<number, any> = new Map()
  private health: Map<number, ShardHealth> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor(config: ShardDatabaseConfig) {
    this.config = config

    // 驗證配置
    const errors = config.validate()
    if (errors.length > 0) {
      throw new Error(`Invalid shard database configuration:\n${errors.join('\n')}`)
    }

    this.initializeHealth()
  }

  /**
   * 初始化健康狀態
   */
  private initializeHealth(): void {
    for (let i = 0; i < this.config.shardCount; i++) {
      this.health.set(i, {
        shardId: i,
        isHealthy: false,
        lastHealthCheck: new Date(),
      })
    }
  }

  /**
   * 初始化數據庫連接
   * 在生產環境中，這應該使用實際的數據庫驅動（如 Knex.js）
   */
  async initialize(): Promise<void> {
    console.log(
      `[ShardDatabaseManager] Initializing ${this.config.shardCount} shard connections...`
    )

    for (let i = 0; i < this.config.shardCount; i++) {
      try {
        const connectionConfig = this.config.getShardConfig(i)
        await this.initializeShard(i, connectionConfig)
        this.markShardHealthy(i)
        console.log(`[ShardDatabaseManager] Shard ${i} initialized successfully`)
      } catch (error) {
        this.markShardUnhealthy(i, String(error))
        console.error(`[ShardDatabaseManager] Failed to initialize shard ${i}:`, error)
      }
    }

    // 啟動定期健康檢查
    this.startHealthCheck()
  }

  /**
   * 初始化單個分片
   * 在生產環境中，此處應建立實際的數據庫連接
   */
  private async initializeShard(
    shardId: number,
    config: ShardDatabaseConnectionConfig
  ): Promise<void> {
    // 模擬連接初始化
    // 在實現中應使用 Knex.js 或 TypeORM 等 ORM
    const connection = {
      shardId,
      host: config.host,
      port: config.port,
      database: config.database,
      schema: this.config.getShardSchemaName(shardId),
      pool: {
        min: config.pool?.min || 2,
        max: config.pool?.max || 10,
      },
      initialized: true,
      createdAt: new Date(),
    }

    this.connections.set(shardId, connection)

    // 在虛擬分片模式下，需要創建 schema
    if (this.config.mode.type === 'virtual') {
      await this.createShardSchema(shardId)
    }

    // 初始化分片表
    await this.initializeShardTables(shardId)
  }

  /**
   * 創建分片 schema（虛擬分片模式）
   */
  private async createShardSchema(shardId: number): Promise<void> {
    const schemaName = this.config.getShardSchemaName(shardId)
    // 在實現中應執行 SQL: CREATE SCHEMA IF NOT EXISTS shard_X
    console.log(`[ShardDatabaseManager] Creating schema: ${schemaName}`)
  }

  /**
   * 初始化分片表結構
   */
  private async initializeShardTables(shardId: number): Promise<void> {
    // 在實現中應在此創建所有必要的表
    // 例如：orders, order_items, payments 等
    const tables = ['orders', 'order_items', 'inventory', 'user_sessions', 'payment_records']

    for (const table of tables) {
      const fullTableName = this.config.getShardTableName(shardId, table)
      console.log(`[ShardDatabaseManager] Initializing table: ${fullTableName}`)
    }
  }

  /**
   * 獲取分片的數據庫連接配置
   */
  getShardConnection(shardId: number): any {
    const conn = this.connections.get(shardId)
    if (!conn) {
      throw new Error(`No connection for shard ${shardId}`)
    }
    return conn
  }

  /**
   * 獲取分片健康狀態
   */
  getShardHealth(shardId: number): ShardHealth | undefined {
    return this.health.get(shardId)
  }

  /**
   * 獲取所有分片健康狀態
   */
  getAllShardHealth(): ShardHealth[] {
    return Array.from(this.health.values())
  }

  /**
   * 標記分片為健康
   */
  private markShardHealthy(shardId: number): void {
    const health = this.health.get(shardId)
    if (health) {
      health.isHealthy = true
      health.lastHealthCheck = new Date()
      health.error = undefined
    }
  }

  /**
   * 標記分片為不健康
   */
  private markShardUnhealthy(shardId: number, error: string): void {
    const health = this.health.get(shardId)
    if (health) {
      health.isHealthy = false
      health.lastHealthCheck = new Date()
      health.error = error
    }
  }

  /**
   * 啟動定期健康檢查
   */
  private startHealthCheck(): void {
    // 每 30 秒檢查一次健康狀態
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, 30000)
  }

  /**
   * 執行健康檢查
   */
  private async performHealthCheck(): Promise<void> {
    for (let i = 0; i < this.config.shardCount; i++) {
      try {
        const conn = this.connections.get(i)
        if (!conn) {
          this.markShardUnhealthy(i, 'No connection')
          continue
        }

        // 在實現中應執行 SELECT 1 查詢來驗證連接
        // 模擬成功檢查
        this.markShardHealthy(i)
      } catch (error) {
        this.markShardUnhealthy(i, String(error))
      }
    }
  }

  /**
   * 獲取統計信息
   */
  getStats(): ShardDatabaseStats {
    const poolStats = new Map<number, PoolStats>()
    const healthyShards = Array.from(this.health.values()).filter((h) => h.isHealthy).length

    for (let i = 0; i < this.config.shardCount; i++) {
      const conn = this.connections.get(i)
      if (conn) {
        poolStats.set(i, {
          shardId: i,
          activeConnections: 0, // 實際實現中應從連接池讀取
          idleConnections: conn.pool?.max || 0,
          totalConnections: conn.pool?.max || 0,
        })
      }
    }

    return {
      totalShards: this.config.shardCount,
      healthyShards,
      connectionPoolStats: poolStats,
    }
  }

  /**
   * 執行數據庫查詢（單分片）
   */
  async query(shardId: number, sql: string, _params?: any[]): Promise<any[]> {
    const health = this.health.get(shardId)
    if (!health?.isHealthy) {
      throw new Error(`Shard ${shardId} is not healthy`)
    }

    // 在實現中應使用實際的數據庫驅動執行查詢
    console.log(`[ShardDatabaseManager] Executing query on shard ${shardId}: ${sql}`)
    return []
  }

  /**
   * 執行事務（單分片）
   */
  async transaction(shardId: number, callback: (trx: any) => Promise<any>): Promise<any> {
    const health = this.health.get(shardId)
    if (!health?.isHealthy) {
      throw new Error(`Shard ${shardId} is not healthy`)
    }

    // 在實現中應使用實際的事務支持
    console.log(`[ShardDatabaseManager] Starting transaction on shard ${shardId}`)
    try {
      return await callback(null)
    } catch (error) {
      console.error(`[ShardDatabaseManager] Transaction failed on shard ${shardId}:`, error)
      throw error
    }
  }

  /**
   * 執行跨分片查詢（並行執行所有分片）
   */
  async queryAll(sql: string, params?: any[]): Promise<Map<number, any[]>> {
    const results = new Map<number, any[]>()

    const promises = []
    for (let i = 0; i < this.config.shardCount; i++) {
      promises.push(
        this.query(i, sql, params)
          .then((result) => results.set(i, result))
          .catch((error) => {
            console.error(`[ShardDatabaseManager] Error querying shard ${i}:`, error)
            results.set(i, [])
          })
      )
    }

    await Promise.all(promises)
    return results
  }

  /**
   * 獲取分片配置
   */
  getConfig(): ShardDatabaseConfig {
    return this.config
  }

  /**
   * 清理資源
   */
  async destroy(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // 關閉所有連接
    for (const [shardId] of this.connections) {
      try {
        // 在實現中應正確關閉數據庫連接
        console.log(`[ShardDatabaseManager] Closing connection for shard ${shardId}`)
      } catch (error) {
        console.error(`[ShardDatabaseManager] Error closing shard ${shardId}:`, error)
      }
    }

    this.connections.clear()
    this.health.clear()
  }
}
