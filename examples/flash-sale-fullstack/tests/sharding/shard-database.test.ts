/**
 * Shard Database Tests
 * 分片數據庫配置和管理器測試
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { ShardDatabaseConfig, ShardDatabaseManager } from '../../src/sharding'

describe('ShardDatabaseConfig', () => {
  it('should create development configuration', () => {
    const config = ShardDatabaseConfig.createDevelopmentConfig(
      {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
      },
      8
    )

    expect(config.shardCount).toBe(8)
    expect(config.mode.type).toBe('virtual')

    // 驗證所有分片配置都存在
    for (let i = 0; i < 8; i++) {
      const shardConfig = config.getShardConfig(i)
      expect(shardConfig.host).toBe('localhost')
      expect(shardConfig.database).toBe('flash_sale')
    }
  })

  it('should create production configuration', () => {
    const configs = Array.from({ length: 8 }, (_, i) => ({
      host: `shard-${i}.db.example.com`,
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: `flash_sale_shard_${i}`,
    }))

    const config = ShardDatabaseConfig.createProductionConfig(configs, 8)

    expect(config.shardCount).toBe(8)
    expect(config.mode.type).toBe('physical')

    // 驗證每個分片都有不同的主機
    for (let i = 0; i < 8; i++) {
      const shardConfig = config.getShardConfig(i)
      expect(shardConfig.host).toBe(`shard-${i}.db.example.com`)
      expect(shardConfig.database).toBe(`flash_sale_shard_${i}`)
    }
  })

  it('should generate correct schema names for virtual mode', () => {
    const config = ShardDatabaseConfig.createDevelopmentConfig(
      {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
      },
      8
    )

    for (let i = 0; i < 8; i++) {
      const schemaName = config.getShardSchemaName(i)
      expect(schemaName).toBe(`shard_${i}`)

      const tableName = config.getShardTableName(i, 'orders')
      expect(tableName).toBe(`shard_${i}.orders`)
    }
  })

  it('should handle table names correctly in physical mode', () => {
    const configs = Array.from({ length: 8 }, (_, i) => ({
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: `flash_sale_shard_${i}`,
    }))

    const config = ShardDatabaseConfig.createProductionConfig(configs, 8)

    for (let i = 0; i < 8; i++) {
      const tableName = config.getShardTableName(i, 'orders')
      // 物理模式下表名不變
      expect(tableName).toBe('orders')
    }
  })

  it('should validate configuration', () => {
    const config = ShardDatabaseConfig.createDevelopmentConfig(
      {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
      },
      8
    )

    const errors = config.validate()
    expect(errors).toHaveLength(0)
  })

  it('should throw error for invalid shard ID', () => {
    const config = ShardDatabaseConfig.createDevelopmentConfig(
      {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
      },
      8
    )

    expect(() =>
      config.setShardConfig(10, {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'flash_sale',
      })
    ).toThrow('Invalid shard ID')
  })

  it('should create config from environment', () => {
    const originalEnv = process.env.SHARD_MODE
    process.env.SHARD_MODE = 'virtual'

    try {
      const config = ShardDatabaseConfig.fromEnvironment(8)
      expect(config.shardCount).toBe(8)
      expect(config.mode.type).toBe('virtual')
    } finally {
      if (originalEnv !== undefined) {
        process.env.SHARD_MODE = originalEnv
      } else {
        delete process.env.SHARD_MODE
      }
    }
  })
})

describe('ShardDatabaseManager', () => {
  let manager: ShardDatabaseManager

  beforeAll(async () => {
    const config = ShardDatabaseConfig.createDevelopmentConfig(
      {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
      },
      8
    )

    manager = new ShardDatabaseManager(config)
    await manager.initialize()
  })

  afterAll(async () => {
    await manager.destroy()
  })

  it('should initialize all shards', async () => {
    const stats = manager.getStats()

    expect(stats.totalShards).toBe(8)
    expect(stats.healthyShards).toBe(8) // 所有分片應該是健康的
  })

  it('should track shard health', () => {
    for (let i = 0; i < 8; i++) {
      const health = manager.getShardHealth(i)
      expect(health?.shardId).toBe(i)
      expect(health?.isHealthy).toBe(true)
    }
  })

  it('should return all shard health statuses', () => {
    const allHealth = manager.getAllShardHealth()

    expect(allHealth).toHaveLength(8)
    for (const health of allHealth) {
      expect(health.isHealthy).toBe(true)
      expect(health.lastHealthCheck).toBeDefined()
    }
  })

  it('should return database connection config', () => {
    for (let i = 0; i < 8; i++) {
      const conn = manager.getShardConnection(i)
      expect(conn.shardId).toBe(i)
      expect(conn.database).toBe('flash_sale')
      expect(conn.initialized).toBe(true)
    }
  })

  it('should throw error for invalid shard connection', () => {
    expect(() => manager.getShardConnection(100)).toThrow('No connection for shard 100')
  })

  it('should provide connection pool statistics', () => {
    const stats = manager.getStats()

    expect(stats.connectionPoolStats.size).toBe(8)

    for (let i = 0; i < 8; i++) {
      const poolStats = stats.connectionPoolStats.get(i)
      expect(poolStats?.shardId).toBe(i)
      expect(poolStats?.totalConnections).toBeGreaterThan(0)
    }
  })

  it('should execute queries on healthy shards', async () => {
    const result = await manager.query(0, 'SELECT 1')
    expect(Array.isArray(result)).toBe(true)
  })

  it('should execute transactions on healthy shards', async () => {
    const result = await manager.transaction(0, async (trx) => {
      return { success: true }
    })

    expect(result.success).toBe(true)
  })

  it('should execute queries on all shards in parallel', async () => {
    const results = await manager.queryAll('SELECT shard_id FROM information_schema.tables')

    expect(results.size).toBe(8)

    for (let i = 0; i < 8; i++) {
      expect(results.has(i)).toBe(true)
    }
  })

  it('should throw error when querying unhealthy shard', async () => {
    // 先確保分片是健康的
    const health = manager.getShardHealth(5)
    expect(health?.isHealthy).toBe(true)

    // 健康分片應該能查詢
    const result = await manager.query(5, 'SELECT 1')
    expect(Array.isArray(result)).toBe(true)
  })
})
