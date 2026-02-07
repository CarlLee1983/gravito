/**
 * @gravito/plasma - RedisClient Core Tests
 *
 * 此檔案包含最基礎的 RedisClient 功能測試
 * 詳細測試已拆分至各功能對應的檔案：
 * - redis-client.strings.test.ts
 * - redis-client.hashes.test.ts
 * - redis-client.lists.test.ts
 * - redis-client.keys.test.ts
 * - redis-client.sets.test.ts
 * - redis-client.sorted-sets.test.ts
 * - redis-client.connection.test.ts
 * - redis-client.ttl.test.ts
 * - redis-client.server.test.ts
 * - redis-client.pubsub.test.ts
 * - redis-client.pipeline.test.ts
 * - redis-client.lua.test.ts
 * - redis-client.streams.test.ts
 * - redis-client.errors.test.ts
 * - redis-client.edge-cases.test.ts
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  MockIORedis,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper)', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  // ========================================================================
  // Core Smoke Tests
  // ========================================================================

  it('should ping', async () => {
    expect(await client.ping()).toBe('PONG')
  })

  it('should check health', async () => {
    expect(await client.checkHealth()).toBe(true)
  })

  it('should get string', async () => {
    expect(await client.get('k')).toBe('val')
  })

  it('should set string (using call)', async () => {
    expect(await client.set('k', 'v')).toBe('OK')
  })

  it('should incr', async () => {
    expect(await client.incr('k')).toBe(1)
  })

  it('should handle hashes', async () => {
    expect(await client.hget('k', 'f')).toBe('value')
    expect(await client.hset('k', 'f', 'v')).toBe(1)
  })

  it('should handle lists', async () => {
    expect(await client.lpush('k', 'v')).toBe(1)
  })

  it('should handle pipeline', async () => {
    const p = client.pipeline()
    p.get('k')
    const res = await p.exec()
    expect(res).toEqual([
      [null, 'val1'],
      [null, 'OK'],
      [null, 1],
    ])
  })
})
