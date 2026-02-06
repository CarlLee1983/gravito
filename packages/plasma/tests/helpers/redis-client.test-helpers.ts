/**
 * @gravito/plasma - RedisClient Test Helpers
 *
 * Shared mock setup for all RedisClient tests
 * 此 helper 提取了原本在 redis-client.test.ts 中的大量 mock setup
 */

import { mock } from 'bun:test'
import type { RedisClient } from '../../src/RedisClient'

export function createMockIORedisInstance() {
  return {
    // Connection & Utils
    connect: mock(async () => {}),
    quit: mock(async () => 'OK'),
    ping: mock(async () => 'PONG'),
    on: mock(() => {}),
    duplicate: mock(function (this: any) {
      return createMockIORedisInstance()
    }),

    // String Operations
    get: mock(async () => 'val'),
    set: mock(async () => 'OK'),
    del: mock(async () => 1),
    exists: mock(async () => 1),
    incr: mock(async () => 1),
    incrby: mock(async () => 5),
    decr: mock(async () => 0),
    decrby: mock(async () => 2),
    append: mock(async () => 10),
    strlen: mock(async () => 5),
    getset: mock(async () => 'old'),
    mget: mock(async () => ['v1', 'v2']),
    mset: mock(async () => 'OK'),

    // TTL Operations
    expire: mock(async () => 1),
    expireat: mock(async () => 1),
    pexpire: mock(async () => 1),
    ttl: mock(async () => 60),
    pttl: mock(async () => 60000),
    persist: mock(async () => 1),

    // Hash Operations
    hget: mock(async () => 'value'),
    hset: mock(async () => 1),
    hdel: mock(async () => 1),
    hexists: mock(async () => 1),
    hgetall: mock(async () => ({ field1: 'value1', field2: 'value2' })),
    hincrby: mock(async () => 5),
    hkeys: mock(async () => ['field1', 'field2']),
    hvals: mock(async () => ['value1', 'value2']),
    hlen: mock(async () => 2),
    hmget: mock(async () => ['value1', 'value2']),
    hmset: mock(async () => 'OK'),

    // List Operations
    lpush: mock(async () => 1),
    rpush: mock(async () => 1),
    lpop: mock(async () => 'value'),
    rpop: mock(async () => 'value'),
    lrange: mock(async () => ['v1', 'v2']),
    llen: mock(async () => 2),
    lindex: mock(async () => 'value'),
    lset: mock(async () => 'OK'),
    lrem: mock(async () => 1),
    ltrim: mock(async () => 'OK'),

    // Set Operations
    sadd: mock(async () => 1),
    srem: mock(async () => 1),
    smembers: mock(async () => ['m1', 'm2']),
    sismember: mock(async () => 1),
    scard: mock(async () => 2),
    spop: mock(async () => 'member'),
    srandmember: mock(async () => 'member'),
    sunion: mock(async () => ['m1', 'm2']),
    sinter: mock(async () => ['m1']),
    sdiff: mock(async () => ['m1']),

    // Sorted Set Operations
    zadd: mock(async () => 1),
    zrem: mock(async () => 1),
    zscore: mock(async () => '1.5'),
    zrank: mock(async () => 1),
    zrevrank: mock(async () => 1),
    zrange: mock(async () => ['m1', 'm2']),
    zrevrange: mock(async () => ['m2', 'm1']),
    zcard: mock(async () => 2),
    zcount: mock(async () => 2),
    zincrby: mock(async () => '2.5'),

    // Key Operations
    keys: mock(async () => ['k1', 'k2']),
    scan: mock(async () => [0, ['k1', 'k2']]),
    type: mock(async () => 'string'),
    rename: mock(async () => 'OK'),
    renamenx: mock(async () => 1),

    // Server Operations
    flushdb: mock(async () => 'OK'),
    flushall: mock(async () => 'OK'),
    dbsize: mock(async () => 100),
    info: mock(async () => '# Info\r\ndb0:keys=1,expires=0'),

    // Pub/Sub
    publish: mock(async () => 1),
    subscribe: mock(async () => {}),
    unsubscribe: mock(async () => {}),

    // Stream Operations
    xlen: mock(async () => 5),
    xrange: mock(async () => [['1526919030474-0', ['field1', 'value1']]]),
    xrevrange: mock(async () => [['1526919030474-0', ['field1', 'value1']]]),
    xtrim: mock(async () => 0),
    xdel: mock(async () => 1),

    // Pipeline
    pipeline: mock(() => ({
      get: mock(function (this: any) {
        return this
      }),
      set: mock(function (this: any) {
        return this
      }),
      del: mock(function (this: any) {
        return this
      }),
      incr: mock(function (this: any) {
        return this
      }),
      decr: mock(function (this: any) {
        return this
      }),
      hget: mock(function (this: any) {
        return this
      }),
      hset: mock(function (this: any) {
        return this
      }),
      hgetall: mock(function (this: any) {
        return this
      }),
      lpush: mock(function (this: any) {
        return this
      }),
      rpush: mock(function (this: any) {
        return this
      }),
      lpop: mock(function (this: any) {
        return this
      }),
      rpop: mock(function (this: any) {
        return this
      }),
      sadd: mock(function (this: any) {
        return this
      }),
      srem: mock(function (this: any) {
        return this
      }),
      smembers: mock(function (this: any) {
        return this
      }),
      sismember: mock(function (this: any) {
        return this
      }),
      scard: mock(function (this: any) {
        return this
      }),
      exec: mock(async () => [
        [null, 'val1'],
        [null, 'OK'],
        [null, 1],
      ]),
    })),

    // Script Operations
    eval: mock(async () => 'OK'),
    evalsha: mock(async () => 'OK'),

    // Generic call for complex operations
    call: mock(async () => 'OK'),
  }
}

export const MockIORedis = {
  default: class {
    constructor() {
      Object.assign(this, createMockIORedisInstance())
    }
  },
}

export function setupRedisClientMock(client: RedisClient, mockIORedisInstance: any) {
  // biome-ignore lint/suspicious/noExplicitAny: Mocking
  ;(client as any).ioredis = MockIORedis
  ;(client as any).connected = true
  ;(client as any).client = mockIORedisInstance

  // Reset all mocks
  Object.values(mockIORedisInstance).forEach((m) => {
    if (typeof m?.mockClear === 'function') {
      m.mockClear()
    }
  })
}
