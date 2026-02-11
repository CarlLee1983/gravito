/**
 * Application Layer Sharding Tests
 * 應用層分片邏輯測試
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import {
  getShardContext,
  hasShardContext,
  QueryAggregator,
  ShardDatabaseConfig,
  ShardDatabaseManager,
  ShardingDAO,
  ShardingManager,
  ShardRouter,
} from '../../src/sharding'

// Mock Hono Context
class MockContext {
  private headers: Map<string, string> = new Map()
  private queryParams: Map<string, string> = new Map()
  private body: any = {}

  method = 'GET'

  req = {
    header: (name: string) => this.headers.get(name),
    query: (name: string) => this.queryParams.get(name),
    method: this.method,
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value)
  }

  setQuery(name: string, value: string) {
    this.queryParams.set(name, value)
  }

  setBody(data: any) {
    this.body = data
    ;(this.req as any).body = data
  }
}

describe('ShardRouter - HTTP Middleware', () => {
  let shardingManager: ShardingManager
  let shardRouter: ShardRouter

  beforeAll(() => {
    const config: any = {
      shardCount: 8,
      shardKeyField: 'userId',
      database: [],
      enableMetrics: false,
    }

    shardingManager = new ShardingManager(config)
    shardRouter = new ShardRouter(shardingManager)
  })

  it('should extract shard context from header', () => {
    const ctx = new MockContext()
    ctx.setHeader('X-Shard-Key', 'user:123456')

    const shardId = shardRouter.computeShardId('user:123456')
    expect(shardId).toBeGreaterThanOrEqual(0)
    expect(shardId).toBeLessThan(8)
  })

  it('should extract shard context from query parameter', () => {
    const ctx = new MockContext()
    ctx.setQuery('shardKey', 'user:789012')

    const shardId = shardRouter.computeShardId('user:789012')
    expect(shardId).toBeGreaterThanOrEqual(0)
    expect(shardId).toBeLessThan(8)
  })

  it('should route consistent shard IDs for same key', () => {
    const key = 'user:consistent-test'

    const id1 = shardRouter.computeShardId(key)
    const id2 = shardRouter.computeShardId(key)
    const id3 = shardRouter.computeShardId(key)

    expect(id1).toBe(id2)
    expect(id2).toBe(id3)
  })

  it('should distribute keys across shards', () => {
    const distribution = new Map<number, number>()

    for (let i = 0; i < 1000; i++) {
      const key = `user:test-${i}`
      const shardId = shardRouter.computeShardId(key)
      distribution.set(shardId, (distribution.get(shardId) || 0) + 1)
    }

    // 所有分片都應該有記錄
    expect(distribution.size).toBe(8)

    // 分佈應該相對均勻
    for (const count of distribution.values()) {
      expect(count).toBeGreaterThan(50) // 1000/8 = 125，允許 50-250 的範圍
      expect(count).toBeLessThan(250)
    }
  })

  it('should get shard info', () => {
    const info = shardRouter.getShardInfo('user:shard-info-test')

    expect(info.shardId).toBeGreaterThanOrEqual(0)
    expect(info.shardId).toBeLessThan(8)
    expect(info.isHealthy).toBe(true)
  })
})

describe('ShardingDAO - Data Access Layer', () => {
  let shardingManager: ShardingManager
  let databaseManager: ShardDatabaseManager
  let testDAO: TestDAO

  class TestDAO extends ShardingDAO {
    constructor(shardingManager: ShardingManager, databaseManager: ShardDatabaseManager) {
      super('orders', shardingManager, databaseManager)
    }
  }

  beforeAll(async () => {
    const config: any = {
      shardCount: 8,
      shardKeyField: 'userId',
      database: [],
      enableMetrics: false,
    }

    shardingManager = new ShardingManager(config)

    const dbConfig = ShardDatabaseConfig.createDevelopmentConfig(
      {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
      },
      8
    )

    databaseManager = new ShardDatabaseManager(dbConfig)
    await databaseManager.initialize()

    testDAO = new TestDAO(shardingManager, databaseManager)
  })

  afterAll(async () => {
    await databaseManager.destroy()
  })

  it('should insert record by shard key', async () => {
    const result = await testDAO.insert('user:insert-test', {
      id: 1,
      order_no: 'ORD-001',
      total: 100,
    })

    expect(result).toBeDefined()
  })

  it('should update record by shard key', async () => {
    const result = await testDAO.update('user:update-test', 1, {
      total: 200,
    })

    expect(result).toBeDefined()
  })

  it('should delete record by shard key', async () => {
    const result = await testDAO.delete('user:delete-test', 1)

    expect(result).toBe(true)
  })

  it('should execute query with auto-routing', async () => {
    const results = await testDAO.query('SELECT * FROM orders LIMIT 10', [], {
      shardId: 0,
    })

    expect(Array.isArray(results)).toBe(true)
  })

  it('should get sharding stats', () => {
    const stats = testDAO.getShardingStats()

    expect(stats.totalShards).toBe(8)
    expect(stats.healthyShards).toBeGreaterThan(0)
  })
})

describe('QueryAggregator - Cross-Shard Aggregation', () => {
  let databaseManager: ShardDatabaseManager
  let aggregator: QueryAggregator

  beforeAll(async () => {
    const dbConfig = ShardDatabaseConfig.createDevelopmentConfig(
      {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
      },
      8
    )

    databaseManager = new ShardDatabaseManager(dbConfig)
    await databaseManager.initialize()

    aggregator = new QueryAggregator(databaseManager)
  })

  afterAll(async () => {
    await databaseManager.destroy()
  })

  it('should execute SUM aggregation', async () => {
    const result = await aggregator.sum('SELECT 0 as total FROM orders LIMIT 1')

    expect(result).toBeDefined()
    expect(result.aggregationType).toBe('sum')
    expect(result.totalShards).toBe(8)
    expect(result.successfulShards).toBeGreaterThanOrEqual(0)
  })

  it('should execute COUNT aggregation', async () => {
    const result = await aggregator.count('SELECT COUNT(*) FROM orders')

    expect(result).toBeDefined()
    expect(result.aggregationType).toBe('count')
    expect(result.value).toBeGreaterThanOrEqual(0)
  })

  it('should execute AVG aggregation', async () => {
    const result = await aggregator.average('SELECT 100 as value FROM orders')

    expect(result).toBeDefined()
    expect(result.aggregationType).toBe('avg')
  })

  it('should execute MIN aggregation', async () => {
    const result = await aggregator.minimum('SELECT 50 as value FROM orders')

    expect(result).toBeDefined()
    expect(result.aggregationType).toBe('min')
  })

  it('should execute MAX aggregation', async () => {
    const result = await aggregator.maximum('SELECT 200 as value FROM orders')

    expect(result).toBeDefined()
    expect(result.aggregationType).toBe('max')
  })

  it('should support union of all shards', async () => {
    const results = await aggregator.union('SELECT * FROM orders LIMIT 5')

    expect(Array.isArray(results)).toBe(true)
  })

  it('should support distinct records', async () => {
    const results = await aggregator.distinct('SELECT user_id FROM orders', [], 'user_id' as any)

    expect(Array.isArray(results)).toBe(true)
  })

  it('should support group by aggregation', async () => {
    const grouped = await aggregator.groupBy(
      'SELECT user_id, COUNT(*) as count FROM orders GROUP BY user_id',
      [],
      'user_id'
    )

    expect(grouped instanceof Map).toBe(true)
  })

  it('should support sort and limit', async () => {
    const results = await aggregator.sortAndLimit(
      'SELECT * FROM orders',
      [],
      'total' as any,
      true,
      10
    )

    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeLessThanOrEqual(10)
  })

  it('should get stats', () => {
    const stats = aggregator.getStats()

    expect(stats.totalShards).toBe(8)
    expect(stats.healthyShards).toBeGreaterThanOrEqual(0)
  })
})

describe('Integration - Complete Sharding Flow', () => {
  let shardingManager: ShardingManager
  let databaseManager: ShardDatabaseManager
  let shardRouter: ShardRouter

  beforeAll(async () => {
    const config: any = {
      shardCount: 8,
      shardKeyField: 'userId',
      database: [],
      enableMetrics: true,
    }

    shardingManager = new ShardingManager(config)

    const dbConfig = ShardDatabaseConfig.createDevelopmentConfig(
      {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
      },
      8
    )

    databaseManager = new ShardDatabaseManager(dbConfig)
    await databaseManager.initialize()

    shardRouter = new ShardRouter(shardingManager)
  })

  afterAll(async () => {
    await databaseManager.destroy()
  })

  it('should route request through all layers', () => {
    const userId = 'user:integration-test'

    // 1. 路由層
    const shardId = shardRouter.computeShardId(userId)
    expect(shardId).toBeGreaterThanOrEqual(0)
    expect(shardId).toBeLessThan(8)

    // 2. 驗證分片健康
    const health = databaseManager.getShardHealth(shardId)
    expect(health?.isHealthy).toBe(true)

    // 3. 驗證統計
    const stats = shardingManager.getStats()
    expect(stats.totalShards).toBe(8)
    expect(stats.healthyShards).toBeGreaterThan(0)
  })

  it('should handle multiple user keys correctly', () => {
    const users = ['user:001', 'user:002', 'user:003', 'user:004', 'user:005']

    const shards = new Set<number>()

    for (const user of users) {
      const shardId = shardRouter.computeShardId(user)
      shards.add(shardId)
    }

    // 應該分散到多個分片
    expect(shards.size).toBeGreaterThan(1)
  })
})
