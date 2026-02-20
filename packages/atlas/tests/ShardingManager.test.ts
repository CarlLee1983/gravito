import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { DB } from '../src/DB'
import { ShardingManager } from '../src/sharding/ShardingManager'

describe('ShardingManager', () => {
  beforeAll(() => {
    // Mock DB connections
    DB.addConnection('shard_0', { driver: 'sqlite', database: ':memory:' })
    DB.addConnection('shard_1', { driver: 'sqlite', database: ':memory:' })
    DB.addConnection('shard_2', { driver: 'sqlite', database: ':memory:' })
  })

  afterAll(async () => {
    await DB.disconnectAll()
  })

  test('should initialize shards correctly', () => {
    const manager = new ShardingManager({
      shardCount: 3,
      shards: [
        { id: 0, driver: 'sqlite', database: ':memory:' },
        { id: 1, driver: 'sqlite', database: ':memory:' },
        { id: 2, driver: 'sqlite', database: ':memory:' },
      ],
    })

    expect(manager.getAllShards().size).toBe(3)
  })

  test('should route keys consistently using default hashing', () => {
    const manager = new ShardingManager({
      shardCount: 3,
      shards: [
        { id: 0, driver: 'sqlite', database: ':memory:' },
        { id: 1, driver: 'sqlite', database: ':memory:' },
        { id: 2, driver: 'sqlite', database: ':memory:' },
      ],
    })

    const shardA = manager.getShard('user_123')
    const shardB = manager.getShard('user_123')
    const shardC = manager.getShard('user_456')

    expect(shardA).toBe(shardB) // Consistency check
    expect(shardC).not.toBe(shardA) // Different key should resolve appropriately depending on modulus/hash
  })

  test('should support modulo strategy', () => {
    const manager = new ShardingManager({
      shardCount: 3,
      algorithm: 'modulo',
      shards: [
        { id: 0, driver: 'sqlite', database: ':memory:' },
        { id: 1, driver: 'sqlite', database: ':memory:' },
        { id: 2, driver: 'sqlite', database: ':memory:' },
      ],
    })

    // 10 % 3 = 1
    const connection = manager.getShard(10)
    expect(connection.getName()).toBe('shard_1') // Atlas names it shard_1 internally if we reused the config
  })
})
