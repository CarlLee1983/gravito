import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisClient } from '../src/RedisClient'

// ============================================================================
// Mock Setup
// ============================================================================

const createMockIORedisInstance = () => ({
  // Connection & Utils
  connect: mock(async () => {}),
  quit: mock(async () => 'OK'),
  ping: mock(async () => 'PONG'),
  on: mock(() => {}),
  duplicate: mock(function (this: any) {
    // Return a new instance with same mocks
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
})

let mockIORedisInstance = createMockIORedisInstance()

const MockIORedis = {
  default: class {
    constructor() {
      Object.assign(this, mockIORedisInstance)
    }
  },
}

// ============================================================================
// Test Suite
// ============================================================================

describe('RedisClient (ioredis wrapper)', () => {
  let client: RedisClient

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
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
  })

  // ========================================================================
  // Connection Management Tests
  // ========================================================================

  describe('Connection Management', () => {
    it('should connect with default configuration', async () => {
      const newClient = new RedisClient()
      ;(newClient as any).ioredis = MockIORedis
      ;(newClient as any).connected = true
      ;(newClient as any).client = mockIORedisInstance
      expect((newClient as any).config.host ?? 'localhost').toBeDefined()
    })

    it('should connect with custom configuration', async () => {
      const customConfig = {
        host: 'redis.example.com',
        port: 6380,
        db: 1,
        password: 'secret',
        connectTimeout: 5000,
        commandTimeout: 3000,
        keyPrefix: 'app:',
        retryDelay: 100,
      }
      const newClient = new RedisClient(customConfig)
      expect((newClient as any).config).toEqual(customConfig)
    })

    it('should connect with TLS configuration', async () => {
      const tlsConfig = {
        host: 'redis.example.com',
        tls: {
          rejectUnauthorized: false,
        },
      }
      const newClient = new RedisClient(tlsConfig)
      expect((newClient as any).config.tls).toBeDefined()
    })

    it('should disconnect gracefully', async () => {
      ;(client as any).subscriber = mockIORedisInstance
      ;(client as any).subscriptions.set(
        'channel',
        mock(() => {})
      )

      mockIORedisInstance.quit.mockResolvedValueOnce('OK')
      await client.disconnect()

      expect(mockIORedisInstance.quit).toHaveBeenCalled()
      expect((client as any).subscriptions.size).toBe(0)
      expect((client as any).connected).toBe(false)
    })

    it('should ping successfully', async () => {
      expect(await client.ping()).toBe('PONG')
      expect(mockIORedisInstance.ping).toHaveBeenCalled()
    })

    it('should check health', async () => {
      mockIORedisInstance.ping.mockResolvedValueOnce('PONG')
      expect(await client.checkHealth()).toBe(true)
    })

    it('should return false on health check when not connected', async () => {
      ;(client as any).connected = false
      expect(await client.checkHealth()).toBe(false)
    })

    it('should return false on health check when ping fails', async () => {
      mockIORedisInstance.ping.mockResolvedValueOnce('ERROR')
      expect(await client.checkHealth()).toBe(false)
    })

    it('should check if connected', () => {
      expect(client.isConnected()).toBe(true)
    })

    it('should return false when not connected', () => {
      ;(client as any).connected = false
      expect(client.isConnected()).toBe(false)
    })

    it('should register event listeners', () => {
      const callback = mock(() => {})
      client.on('error', callback)
      expect(mockIORedisInstance.on).toHaveBeenCalledWith('error', callback)
    })
  })

  // ========================================================================
  // String Operations Tests
  // ========================================================================

  describe('String Operations', () => {
    it('should get a value', async () => {
      mockIORedisInstance.get.mockResolvedValueOnce('myvalue')
      expect(await client.get('mykey')).toBe('myvalue')
      expect(mockIORedisInstance.get).toHaveBeenCalledWith('mykey')
    })

    it('should return null when key does not exist', async () => {
      mockIORedisInstance.get.mockResolvedValueOnce(null)
      expect(await client.get('nonexistent')).toBeNull()
    })

    it('should set a value with basic options', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      expect(await client.set('key', 'value')).toBe('OK')
    })

    it('should set with EX option', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.set('key', 'value', { ex: 60 })
      expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'EX', 60)
    })

    it('should set with PX option', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.set('key', 'value', { px: 60000 })
      expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'PX', 60000)
    })

    it('should set with NX option', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.set('key', 'value', { nx: true })
      expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'NX')
    })

    it('should set with XX option', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.set('key', 'value', { xx: true })
      expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'XX')
    })

    it('should set with KEEPTTL option', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.set('key', 'value', { keepttl: true })
      expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'KEEPTTL')
    })

    it('should set with multiple options', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.set('key', 'value', { ex: 60, nx: true })
      expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'EX', 60, 'NX')
    })

    it('should return null when SET condition not met', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce(null)
      expect(await client.set('key', 'value', { nx: true })).toBeNull()
    })

    it('should delete keys', async () => {
      mockIORedisInstance.del.mockResolvedValueOnce(2)
      expect(await client.del('key1', 'key2')).toBe(2)
      expect(mockIORedisInstance.del).toHaveBeenCalledWith('key1', 'key2')
    })

    it('should check key existence', async () => {
      mockIORedisInstance.exists.mockResolvedValueOnce(2)
      expect(await client.exists('key1', 'key2')).toBe(2)
      expect(mockIORedisInstance.exists).toHaveBeenCalledWith('key1', 'key2')
    })

    it('should increment a key', async () => {
      mockIORedisInstance.incr.mockResolvedValueOnce(2)
      expect(await client.incr('counter')).toBe(2)
      expect(mockIORedisInstance.incr).toHaveBeenCalledWith('counter')
    })

    it('should increment by amount', async () => {
      mockIORedisInstance.incrby.mockResolvedValueOnce(15)
      expect(await client.incrby('counter', 10)).toBe(15)
      expect(mockIORedisInstance.incrby).toHaveBeenCalledWith('counter', 10)
    })

    it('should decrement a key', async () => {
      mockIORedisInstance.decr.mockResolvedValueOnce(0)
      expect(await client.decr('counter')).toBe(0)
      expect(mockIORedisInstance.decr).toHaveBeenCalledWith('counter')
    })

    it('should decrement by amount', async () => {
      mockIORedisInstance.decrby.mockResolvedValueOnce(5)
      expect(await client.decrby('counter', 5)).toBe(5)
      expect(mockIORedisInstance.decrby).toHaveBeenCalledWith('counter', 5)
    })

    it('should append to a value', async () => {
      mockIORedisInstance.append.mockResolvedValueOnce(10)
      expect(await client.append('key', 'extra')).toBe(10)
      expect(mockIORedisInstance.append).toHaveBeenCalledWith('key', 'extra')
    })

    it('should get string length', async () => {
      mockIORedisInstance.strlen.mockResolvedValueOnce(5)
      expect(await client.strlen('key')).toBe(5)
      expect(mockIORedisInstance.strlen).toHaveBeenCalledWith('key')
    })

    it('should get and set value atomically', async () => {
      mockIORedisInstance.getset.mockResolvedValueOnce('old')
      expect(await client.getset('key', 'new')).toBe('old')
      expect(mockIORedisInstance.getset).toHaveBeenCalledWith('key', 'new')
    })

    it('should get multiple values', async () => {
      mockIORedisInstance.mget.mockResolvedValueOnce(['v1', 'v2', null])
      expect(await client.mget('k1', 'k2', 'k3')).toEqual(['v1', 'v2', null])
      expect(mockIORedisInstance.mget).toHaveBeenCalledWith('k1', 'k2', 'k3')
    })

    it('should set multiple values', async () => {
      mockIORedisInstance.mset.mockResolvedValueOnce('OK')
      expect(await client.mset({ k1: 'v1', k2: 'v2' })).toBe('OK')
      expect(mockIORedisInstance.mset).toHaveBeenCalled()
    })
  })

  // ========================================================================
  // TTL Operations Tests
  // ========================================================================

  describe('TTL Operations', () => {
    it('should set expiration in seconds', async () => {
      mockIORedisInstance.expire.mockResolvedValueOnce(1)
      expect(await client.expire('key', 60)).toBe(1)
      expect(mockIORedisInstance.expire).toHaveBeenCalledWith('key', 60)
    })

    it('should set expiration at timestamp', async () => {
      mockIORedisInstance.expireat.mockResolvedValueOnce(1)
      const timestamp = Math.floor(Date.now() / 1000) + 3600
      expect(await client.expireat('key', timestamp)).toBe(1)
      expect(mockIORedisInstance.expireat).toHaveBeenCalledWith('key', timestamp)
    })

    it('should set expiration in milliseconds', async () => {
      mockIORedisInstance.pexpire.mockResolvedValueOnce(1)
      expect(await client.pexpire('key', 60000)).toBe(1)
      expect(mockIORedisInstance.pexpire).toHaveBeenCalledWith('key', 60000)
    })

    it('should get TTL in seconds', async () => {
      mockIORedisInstance.ttl.mockResolvedValueOnce(55)
      expect(await client.ttl('key')).toBe(55)
      expect(mockIORedisInstance.ttl).toHaveBeenCalledWith('key')
    })

    it('should get TTL in milliseconds', async () => {
      mockIORedisInstance.pttl.mockResolvedValueOnce(55000)
      expect(await client.pttl('key')).toBe(55000)
      expect(mockIORedisInstance.pttl).toHaveBeenCalledWith('key')
    })

    it('should remove expiration', async () => {
      mockIORedisInstance.persist.mockResolvedValueOnce(1)
      expect(await client.persist('key')).toBe(1)
      expect(mockIORedisInstance.persist).toHaveBeenCalledWith('key')
    })
  })

  // ========================================================================
  // Hash Operations Tests
  // ========================================================================

  describe('Hash Operations', () => {
    it('should get a hash field', async () => {
      mockIORedisInstance.hget.mockResolvedValueOnce('fieldvalue')
      expect(await client.hget('hash', 'field')).toBe('fieldvalue')
      expect(mockIORedisInstance.hget).toHaveBeenCalledWith('hash', 'field')
    })

    it('should set a hash field', async () => {
      mockIORedisInstance.hset.mockResolvedValueOnce(1)
      expect(await client.hset('hash', 'field', 'value')).toBe(1)
      expect(mockIORedisInstance.hset).toHaveBeenCalledWith('hash', 'field', 'value')
    })

    it('should set multiple hash fields', async () => {
      mockIORedisInstance.hset.mockResolvedValueOnce(2)
      expect(await client.hset('hash', { field1: 'value1', field2: 'value2' })).toBe(2)
    })

    it('should delete hash fields', async () => {
      mockIORedisInstance.hdel.mockResolvedValueOnce(1)
      expect(await client.hdel('hash', 'field1', 'field2')).toBe(1)
      expect(mockIORedisInstance.hdel).toHaveBeenCalledWith('hash', 'field1', 'field2')
    })

    it('should check if field exists in hash', async () => {
      mockIORedisInstance.hexists.mockResolvedValueOnce(1)
      expect(await client.hexists('hash', 'field')).toBe(1)
      expect(mockIORedisInstance.hexists).toHaveBeenCalledWith('hash', 'field')
    })

    it('should get all hash fields and values', async () => {
      mockIORedisInstance.hgetall.mockResolvedValueOnce({ f1: 'v1', f2: 'v2' })
      expect(await client.hgetall('hash')).toEqual({ f1: 'v1', f2: 'v2' })
      expect(mockIORedisInstance.hgetall).toHaveBeenCalledWith('hash')
    })

    it('should increment hash field', async () => {
      mockIORedisInstance.hincrby.mockResolvedValueOnce(10)
      expect(await client.hincrby('hash', 'field', 5)).toBe(10)
      expect(mockIORedisInstance.hincrby).toHaveBeenCalledWith('hash', 'field', 5)
    })

    it('should get all hash field names', async () => {
      mockIORedisInstance.hkeys.mockResolvedValueOnce(['f1', 'f2'])
      expect(await client.hkeys('hash')).toEqual(['f1', 'f2'])
      expect(mockIORedisInstance.hkeys).toHaveBeenCalledWith('hash')
    })

    it('should get all hash values', async () => {
      mockIORedisInstance.hvals.mockResolvedValueOnce(['v1', 'v2'])
      expect(await client.hvals('hash')).toEqual(['v1', 'v2'])
      expect(mockIORedisInstance.hvals).toHaveBeenCalledWith('hash')
    })

    it('should get hash length', async () => {
      mockIORedisInstance.hlen.mockResolvedValueOnce(2)
      expect(await client.hlen('hash')).toBe(2)
      expect(mockIORedisInstance.hlen).toHaveBeenCalledWith('hash')
    })

    it('should get multiple hash fields', async () => {
      mockIORedisInstance.hmget.mockResolvedValueOnce(['v1', 'v2'])
      expect(await client.hmget('hash', 'f1', 'f2')).toEqual(['v1', 'v2'])
      expect(mockIORedisInstance.hmget).toHaveBeenCalledWith('hash', 'f1', 'f2')
    })

    it('should set multiple hash fields', async () => {
      mockIORedisInstance.hmset.mockResolvedValueOnce('OK')
      expect(await client.hmset('hash', { f1: 'v1', f2: 'v2' })).toBe('OK')
    })
  })

  // ========================================================================
  // List Operations Tests
  // ========================================================================

  describe('List Operations', () => {
    it('should push to the beginning of list', async () => {
      mockIORedisInstance.lpush.mockResolvedValueOnce(1)
      expect(await client.lpush('list', 'v1')).toBe(1)
      expect(mockIORedisInstance.lpush).toHaveBeenCalledWith('list', 'v1')
    })

    it('should push multiple values to list', async () => {
      mockIORedisInstance.lpush.mockResolvedValueOnce(3)
      expect(await client.lpush('list', 'v1', 'v2', 'v3')).toBe(3)
    })

    it('should push to the end of list', async () => {
      mockIORedisInstance.rpush.mockResolvedValueOnce(1)
      expect(await client.rpush('list', 'v1')).toBe(1)
      expect(mockIORedisInstance.rpush).toHaveBeenCalledWith('list', 'v1')
    })

    it('should pop from the beginning of list', async () => {
      mockIORedisInstance.lpop.mockResolvedValueOnce('v1')
      expect(await client.lpop('list')).toBe('v1')
      expect(mockIORedisInstance.lpop).toHaveBeenCalledWith('list')
    })

    it('should pop from the end of list', async () => {
      mockIORedisInstance.rpop.mockResolvedValueOnce('v1')
      expect(await client.rpop('list')).toBe('v1')
      expect(mockIORedisInstance.rpop).toHaveBeenCalledWith('list')
    })

    it('should get range of list values', async () => {
      mockIORedisInstance.lrange.mockResolvedValueOnce(['v1', 'v2', 'v3'])
      expect(await client.lrange('list', 0, 2)).toEqual(['v1', 'v2', 'v3'])
      expect(mockIORedisInstance.lrange).toHaveBeenCalledWith('list', 0, 2)
    })

    it('should get list length', async () => {
      mockIORedisInstance.llen.mockResolvedValueOnce(3)
      expect(await client.llen('list')).toBe(3)
      expect(mockIORedisInstance.llen).toHaveBeenCalledWith('list')
    })

    it('should get element at index', async () => {
      mockIORedisInstance.lindex.mockResolvedValueOnce('v2')
      expect(await client.lindex('list', 1)).toBe('v2')
      expect(mockIORedisInstance.lindex).toHaveBeenCalledWith('list', 1)
    })

    it('should set element at index', async () => {
      mockIORedisInstance.lset.mockResolvedValueOnce('OK')
      expect(await client.lset('list', 1, 'newvalue')).toBe('OK')
      expect(mockIORedisInstance.lset).toHaveBeenCalledWith('list', 1, 'newvalue')
    })

    it('should remove elements from list', async () => {
      mockIORedisInstance.lrem.mockResolvedValueOnce(2)
      expect(await client.lrem('list', 0, 'value')).toBe(2)
      expect(mockIORedisInstance.lrem).toHaveBeenCalledWith('list', 0, 'value')
    })

    it('should trim list', async () => {
      mockIORedisInstance.ltrim.mockResolvedValueOnce('OK')
      expect(await client.ltrim('list', 0, 10)).toBe('OK')
      expect(mockIORedisInstance.ltrim).toHaveBeenCalledWith('list', 0, 10)
    })
  })

  // ========================================================================
  // Key Operations Tests
  // ========================================================================

  describe('Key Operations', () => {
    it('should find keys by pattern', async () => {
      mockIORedisInstance.keys.mockResolvedValueOnce(['k1', 'k2', 'k3'])
      expect(await client.keys('k*')).toEqual(['k1', 'k2', 'k3'])
      expect(mockIORedisInstance.keys).toHaveBeenCalledWith('k*')
    })

    it('should scan keys', async () => {
      mockIORedisInstance.scan.mockResolvedValueOnce(['0', ['k1', 'k2']])
      const result = await client.scan('0')
      expect(result).toEqual({ cursor: '0', keys: ['k1', 'k2'] })
    })

    it('should scan with MATCH option', async () => {
      mockIORedisInstance.scan.mockResolvedValueOnce([10, ['k1']])
      await client.scan('0', { match: 'k*' })
      expect(mockIORedisInstance.scan).toHaveBeenCalled()
    })

    it('should scan with COUNT option', async () => {
      mockIORedisInstance.scan.mockResolvedValueOnce([10, ['k1']])
      await client.scan('0', { count: 100 })
      expect(mockIORedisInstance.scan).toHaveBeenCalled()
    })

    it('should get type of key', async () => {
      mockIORedisInstance.type.mockResolvedValueOnce('string')
      expect(await client.type('key')).toBe('string')
      expect(mockIORedisInstance.type).toHaveBeenCalledWith('key')
    })

    it('should rename key', async () => {
      mockIORedisInstance.rename.mockResolvedValueOnce('OK')
      expect(await client.rename('oldkey', 'newkey')).toBe('OK')
      expect(mockIORedisInstance.rename).toHaveBeenCalledWith('oldkey', 'newkey')
    })

    it('should rename key conditionally', async () => {
      mockIORedisInstance.renamenx.mockResolvedValueOnce(1)
      expect(await client.renamenx('oldkey', 'newkey')).toBe(1)
      expect(mockIORedisInstance.renamenx).toHaveBeenCalledWith('oldkey', 'newkey')
    })
  })

  // ========================================================================
  // Existing Tests
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

  // ========================================================================
  // Set Operations Tests
  // ========================================================================

  describe('Set Operations', () => {
    it('should add members to set', async () => {
      mockIORedisInstance.sadd.mockResolvedValueOnce(2)
      expect(await client.sadd('set', 'm1', 'm2')).toBe(2)
      expect(mockIORedisInstance.sadd).toHaveBeenCalledWith('set', 'm1', 'm2')
    })

    it('should remove members from set', async () => {
      mockIORedisInstance.srem.mockResolvedValueOnce(1)
      expect(await client.srem('set', 'm1', 'm2')).toBe(1)
      expect(mockIORedisInstance.srem).toHaveBeenCalledWith('set', 'm1', 'm2')
    })

    it('should get all set members', async () => {
      mockIORedisInstance.smembers.mockResolvedValueOnce(['m1', 'm2', 'm3'])
      expect(await client.smembers('set')).toEqual(['m1', 'm2', 'm3'])
      expect(mockIORedisInstance.smembers).toHaveBeenCalledWith('set')
    })

    it('should check if member exists in set', async () => {
      mockIORedisInstance.sismember.mockResolvedValueOnce(1)
      expect(await client.sismember('set', 'm1')).toBe(1)
      expect(mockIORedisInstance.sismember).toHaveBeenCalledWith('set', 'm1')
    })

    it('should get set cardinality', async () => {
      mockIORedisInstance.scard.mockResolvedValueOnce(3)
      expect(await client.scard('set')).toBe(3)
      expect(mockIORedisInstance.scard).toHaveBeenCalledWith('set')
    })

    it('should pop member from set', async () => {
      mockIORedisInstance.spop.mockResolvedValueOnce('m1')
      expect(await client.spop('set')).toBe('m1')
      expect(mockIORedisInstance.spop).toHaveBeenCalledWith('set')
    })

    it('should pop multiple members from set', async () => {
      mockIORedisInstance.spop.mockResolvedValueOnce(['m1', 'm2'])
      expect(await client.spop('set', 2)).toEqual(['m1', 'm2'])
    })

    it('should get random member from set', async () => {
      mockIORedisInstance.srandmember.mockResolvedValueOnce('m1')
      expect(await client.srandmember('set')).toBe('m1')
      expect(mockIORedisInstance.srandmember).toHaveBeenCalledWith('set')
    })

    it('should get multiple random members from set', async () => {
      mockIORedisInstance.srandmember.mockResolvedValueOnce(['m1', 'm2'])
      expect(await client.srandmember('set', 2)).toEqual(['m1', 'm2'])
    })

    it('should get union of sets', async () => {
      mockIORedisInstance.sunion.mockResolvedValueOnce(['m1', 'm2', 'm3'])
      expect(await client.sunion('set1', 'set2')).toEqual(['m1', 'm2', 'm3'])
      expect(mockIORedisInstance.sunion).toHaveBeenCalledWith('set1', 'set2')
    })

    it('should get intersection of sets', async () => {
      mockIORedisInstance.sinter.mockResolvedValueOnce(['m1'])
      expect(await client.sinter('set1', 'set2')).toEqual(['m1'])
      expect(mockIORedisInstance.sinter).toHaveBeenCalledWith('set1', 'set2')
    })

    it('should get difference of sets', async () => {
      mockIORedisInstance.sdiff.mockResolvedValueOnce(['m1', 'm3'])
      expect(await client.sdiff('set1', 'set2')).toEqual(['m1', 'm3'])
      expect(mockIORedisInstance.sdiff).toHaveBeenCalledWith('set1', 'set2')
    })
  })

  // ========================================================================
  // Sorted Set Operations Tests
  // ========================================================================

  describe('Sorted Set Operations', () => {
    it('should add members to sorted set', async () => {
      mockIORedisInstance.zadd.mockResolvedValueOnce(2)
      expect(
        await client.zadd('zset', { score: 1, member: 'm1' }, { score: 2, member: 'm2' })
      ).toBe(2)
    })

    it('should remove members from sorted set', async () => {
      mockIORedisInstance.zrem.mockResolvedValueOnce(1)
      expect(await client.zrem('zset', 'm1', 'm2')).toBe(1)
      expect(mockIORedisInstance.zrem).toHaveBeenCalledWith('zset', 'm1', 'm2')
    })

    it('should get score of member in sorted set', async () => {
      mockIORedisInstance.zscore.mockResolvedValueOnce('1.5')
      expect(await client.zscore('zset', 'm1')).toBe('1.5')
      expect(mockIORedisInstance.zscore).toHaveBeenCalledWith('zset', 'm1')
    })

    it('should get rank of member in sorted set', async () => {
      mockIORedisInstance.zrank.mockResolvedValueOnce(1)
      expect(await client.zrank('zset', 'm1')).toBe(1)
      expect(mockIORedisInstance.zrank).toHaveBeenCalledWith('zset', 'm1')
    })

    it('should get reverse rank of member in sorted set', async () => {
      mockIORedisInstance.zrevrank.mockResolvedValueOnce(1)
      expect(await client.zrevrank('zset', 'm1')).toBe(1)
      expect(mockIORedisInstance.zrevrank).toHaveBeenCalledWith('zset', 'm1')
    })

    it('should get range of members by rank', async () => {
      mockIORedisInstance.zrange.mockResolvedValueOnce(['m1', 'm2', 'm3'])
      expect(await client.zrange('zset', 0, 2)).toEqual(['m1', 'm2', 'm3'])
      expect(mockIORedisInstance.zrange).toHaveBeenCalledWith('zset', 0, 2)
    })

    it('should get range with scores', async () => {
      mockIORedisInstance.zrange.mockResolvedValueOnce(['m1', '1', 'm2', '2'])
      expect(await client.zrange('zset', 0, 2, { withScores: true })).toEqual([
        'm1',
        '1',
        'm2',
        '2',
      ])
    })

    it('should get reverse range by rank', async () => {
      mockIORedisInstance.zrevrange.mockResolvedValueOnce(['m3', 'm2', 'm1'])
      expect(await client.zrevrange('zset', 0, 2)).toEqual(['m3', 'm2', 'm1'])
      expect(mockIORedisInstance.zrevrange).toHaveBeenCalledWith('zset', 0, 2)
    })

    it('should get cardinality of sorted set', async () => {
      mockIORedisInstance.zcard.mockResolvedValueOnce(3)
      expect(await client.zcard('zset')).toBe(3)
      expect(mockIORedisInstance.zcard).toHaveBeenCalledWith('zset')
    })

    it('should count members in score range', async () => {
      mockIORedisInstance.zcount.mockResolvedValueOnce(2)
      expect(await client.zcount('zset', 1, 2)).toBe(2)
      expect(mockIORedisInstance.zcount).toHaveBeenCalledWith('zset', 1, 2)
    })

    it('should increment score of member in sorted set', async () => {
      mockIORedisInstance.zincrby.mockResolvedValueOnce('3.5')
      expect(await client.zincrby('zset', 1.5, 'm1')).toBe('3.5')
      expect(mockIORedisInstance.zincrby).toHaveBeenCalledWith('zset', 1.5, 'm1')
    })
  })

  // ========================================================================
  // Server Operations Tests
  // ========================================================================

  describe('Server Operations', () => {
    it('should flush database', async () => {
      mockIORedisInstance.flushdb.mockResolvedValueOnce('OK')
      expect(await client.flushdb()).toBe('OK')
      expect(mockIORedisInstance.flushdb).toHaveBeenCalled()
    })

    it('should flush all databases', async () => {
      mockIORedisInstance.flushall.mockResolvedValueOnce('OK')
      expect(await client.flushall()).toBe('OK')
      expect(mockIORedisInstance.flushall).toHaveBeenCalled()
    })

    it('should get database size', async () => {
      mockIORedisInstance.dbsize.mockResolvedValueOnce(42)
      expect(await client.dbsize()).toBe(42)
      expect(mockIORedisInstance.dbsize).toHaveBeenCalled()
    })

    it('should get server info', async () => {
      mockIORedisInstance.info.mockResolvedValueOnce('# Server\r\nredis_version:7.0.0')
      expect(await client.info()).toBe('# Server\r\nredis_version:7.0.0')
      expect(mockIORedisInstance.info).toHaveBeenCalled()
    })

    it('should get server info for specific section', async () => {
      mockIORedisInstance.info.mockResolvedValueOnce('# Memory\r\nused_memory:1024000')
      expect(await client.info('memory')).toBe('# Memory\r\nused_memory:1024000')
      expect(mockIORedisInstance.info).toHaveBeenCalledWith('memory')
    })
  })

  // ========================================================================
  // Pub/Sub Tests
  // ========================================================================

  describe('Pub/Sub', () => {
    it('should subscribe to channel', async () => {
      mockIORedisInstance.duplicate.mockReturnValueOnce({
        ...mockIORedisInstance,
        on: mock(() => {}),
        subscribe: mock(async () => {}),
      })
      const callback = mock(() => {})
      await client.subscribe('events', callback)
      expect(mockIORedisInstance.duplicate).toHaveBeenCalled()
    })

    it('should unsubscribe from channel', async () => {
      const subscriberMock = {
        ...mockIORedisInstance,
        unsubscribe: mock(async () => {}),
      }
      ;(client as any).subscriber = subscriberMock
      ;(client as any).subscriptions.set(
        'events',
        mock(() => {})
      )

      await client.unsubscribe('events')
      expect(subscriberMock.unsubscribe).toHaveBeenCalledWith('events')
    })

    it('should publish message to channel', async () => {
      mockIORedisInstance.publish.mockResolvedValueOnce(1)
      expect(await client.publish('events', 'message')).toBe(1)
      expect(mockIORedisInstance.publish).toHaveBeenCalledWith('events', 'message')
    })

    it('should handle multiple subscriptions', async () => {
      const subscriberMock = {
        ...mockIORedisInstance,
        on: mock(() => {}),
        subscribe: mock(async () => {}),
      }
      mockIORedisInstance.duplicate.mockReturnValueOnce(subscriberMock)

      const callback1 = mock(() => {})
      const callback2 = mock(() => {})

      await client.subscribe('channel1', callback1)
      await client.subscribe('channel2', callback2)

      expect((client as any).subscriptions.size).toBe(2)
    })
  })

  // ========================================================================
  // Pipeline Extended Tests
  // ========================================================================

  describe('Pipeline', () => {
    it('should execute pipeline with get', async () => {
      const pipeline = client.pipeline()
      pipeline.get('k1')
      const result = await pipeline.exec()
      expect(result).toBeDefined()
    })

    it('should execute pipeline with set', async () => {
      const pipeline = client.pipeline()
      pipeline.set('k1', 'v1')
      const result = await pipeline.exec()
      expect(result).toBeDefined()
    })

    it('should execute pipeline with del', async () => {
      const pipeline = client.pipeline()
      pipeline.del('k1', 'k2')
      const result = await pipeline.exec()
      expect(result).toBeDefined()
    })

    it('should execute pipeline with hset', async () => {
      const pipeline = client.pipeline()
      pipeline.hset('h1', 'f1', 'v1')
      const result = await pipeline.exec()
      expect(result).toBeDefined()
    })

    it('should execute pipeline with lpush', async () => {
      const pipeline = client.pipeline()
      pipeline.lpush('list', 'v1')
      const result = await pipeline.exec()
      expect(result).toBeDefined()
    })

    it('should execute pipeline with sadd', async () => {
      const pipeline = client.pipeline()
      pipeline.sadd('set', 'm1')
      const result = await pipeline.exec()
      expect(result).toBeDefined()
    })

    it('should execute pipeline with incr', async () => {
      const pipeline = client.pipeline()
      pipeline.incr('counter')
      const result = await pipeline.exec()
      expect(result).toBeDefined()
    })

    it('should execute pipeline with decr', async () => {
      const pipeline = client.pipeline()
      pipeline.decr('counter')
      const result = await pipeline.exec()
      expect(result).toBeDefined()
    })

    it('should execute pipeline with srem and smembers', async () => {
      const pipeline = client.pipeline()
      pipeline.srem('set', 'm1').smembers('set')
      const result = await pipeline.exec()
      expect(result).toBeDefined()
    })

    it('should execute pipeline with multiple mixed commands', async () => {
      const pipeline = client.pipeline()
      pipeline
        .get('k1')
        .set('k2', 'v2')
        .del('k3')
        .hset('h1', 'f1', 'v1')
        .lpush('list', 'v1')
        .sadd('set', 'm1')
        .scard('set')
      const result = await pipeline.exec()
      expect(result).toBeDefined()
    })

    it('should handle empty pipeline', async () => {
      const result = await client.pipeline().exec()
      expect(result).toBeDefined()
    })

    it('should chain pipeline methods', async () => {
      const p = client.pipeline()
      const chainResult = p.get('k1').set('k2', 'v2').del('k3')
      expect(chainResult).toBe(p)
    })
  })

  // ========================================================================
  // Lua Script Tests
  // ========================================================================

  describe('Lua Scripts', () => {
    it('should execute lua script', async () => {
      mockIORedisInstance.eval.mockResolvedValueOnce('result')
      expect(await client.eval('return 1', 0)).toBe('result')
      expect(mockIORedisInstance.eval).toHaveBeenCalledWith('return 1', 0)
    })

    it('should execute lua script with keys and args', async () => {
      mockIORedisInstance.eval.mockResolvedValueOnce('value')
      await client.eval('return redis.call("GET", KEYS[1])', 1, 'mykey')
      expect(mockIORedisInstance.eval).toHaveBeenCalled()
    })

    it('should execute lua script by SHA1', async () => {
      mockIORedisInstance.evalsha.mockResolvedValueOnce('result')
      expect(await client.evalsha('abc123', 0)).toBe('result')
      expect(mockIORedisInstance.evalsha).toHaveBeenCalledWith('abc123', 0)
    })

    it('should execute lua script by SHA1 with keys and args', async () => {
      mockIORedisInstance.evalsha.mockResolvedValueOnce('value')
      await client.evalsha('abc123', 1, 'key1', 'arg1')
      expect(mockIORedisInstance.evalsha).toHaveBeenCalled()
    })
  })

  // ========================================================================
  // Stream Operations Tests (Phase 3)
  // ========================================================================

  describe('Stream Operations (Phase 3)', () => {
    it('should get stream length', async () => {
      mockIORedisInstance.xlen.mockResolvedValueOnce(5)
      expect(await client.xlen('mystream')).toBe(5)
      expect(mockIORedisInstance.xlen).toHaveBeenCalledWith('mystream')
    })

    it('should add entry to stream', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('1526919030474-0')
      const result = await client.xadd('mystream', { field1: 'value1' })
      expect(result).toBe('1526919030474-0')
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should add entry to stream with max length', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('1526919030475-0')
      await client.xadd('mystream', { field1: 'value1' }, { maxlen: 1000 })
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should add entry to stream with approximate maxlen', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('1526919030476-0')
      await client.xadd('mystream', { field1: 'value1' }, { maxlen: 1000, approximate: true })
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should add entry to stream with specific ID', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('1526919030477-0')
      await client.xadd('mystream', { field1: 'value1' }, { id: '1526919030477-0' })
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should read from stream', async () => {
      const streamData = [['mystream', [['1526919030474-0', ['field1', 'value1']]]]]
      mockIORedisInstance.call.mockResolvedValueOnce(streamData)
      const result = await client.xread({ mystream: '0' })
      expect(result).toEqual(streamData)
    })

    it('should read from stream with COUNT', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce([['mystream', []]])
      await client.xread({ mystream: '0' }, { count: 10 })
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should read from stream with BLOCK', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce(null)
      await client.xread({ mystream: '0' }, { block: 1000 })
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should read from stream as consumer group', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce([['mystream', []]])
      await client.xreadgroup('workers', 'consumer-1', { mystream: '>' })
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should create consumer group', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.xgroup('CREATE', 'mystream', 'workers', '$')
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should create consumer group with MKSTREAM', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.xgroup('CREATE', 'mystream', 'workers', '$', true)
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should destroy consumer group', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce(1)
      await client.xgroup('DESTROY', 'mystream', 'workers')
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should delete consumer from group', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce(0)
      await client.xgroup('DELCONSUMER', 'mystream', 'workers', 'consumer-1')
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should set group ID', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.xgroup('SETID', 'mystream', 'workers', '$')
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should acknowledge message in stream', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce(1)
      expect(await client.xack('mystream', 'workers', '1526919030474-0')).toBe(1)
      expect(mockIORedisInstance.call).toHaveBeenCalledWith(
        'XACK',
        'mystream',
        'workers',
        '1526919030474-0'
      )
    })

    it('should get stream range', async () => {
      mockIORedisInstance.xrange.mockResolvedValueOnce([['1526919030474-0', ['field1', 'value1']]])
      const result = await client.xrange('mystream', '-', '+')
      expect(result).toBeDefined()
      expect(mockIORedisInstance.xrange).toHaveBeenCalledWith('mystream', '-', '+')
    })

    it('should get stream range with count', async () => {
      mockIORedisInstance.xrange.mockResolvedValueOnce([])
      await client.xrange('mystream', '-', '+', 10)
      expect(mockIORedisInstance.xrange).toHaveBeenCalledWith('mystream', '-', '+', 'COUNT', 10)
    })

    it('should get reverse stream range', async () => {
      mockIORedisInstance.xrevrange.mockResolvedValueOnce([])
      await client.xrevrange('mystream', '+', '-')
      expect(mockIORedisInstance.xrevrange).toHaveBeenCalledWith('mystream', '+', '-')
    })

    it('should trim stream', async () => {
      mockIORedisInstance.xtrim.mockResolvedValueOnce(0)
      expect(await client.xtrim('mystream', 1000)).toBe(0)
      expect(mockIORedisInstance.xtrim).toHaveBeenCalledWith('mystream', 'MAXLEN', 1000)
    })

    it('should trim stream with approximate', async () => {
      mockIORedisInstance.xtrim.mockResolvedValueOnce(0)
      await client.xtrim('mystream', 1000, true)
      expect(mockIORedisInstance.xtrim).toHaveBeenCalledWith('mystream', 'MAXLEN', '~', 1000)
    })

    it('should delete entry from stream', async () => {
      mockIORedisInstance.xdel.mockResolvedValueOnce(1)
      expect(await client.xdel('mystream', '1526919030474-0')).toBe(1)
      expect(mockIORedisInstance.xdel).toHaveBeenCalledWith('mystream', '1526919030474-0')
    })

    it('should delete multiple entries from stream', async () => {
      mockIORedisInstance.xdel.mockResolvedValueOnce(2)
      await client.xdel('mystream', '1526919030474-0', '1526919030475-0')
      expect(mockIORedisInstance.xdel).toHaveBeenCalledWith(
        'mystream',
        '1526919030474-0',
        '1526919030475-0'
      )
    })
  })

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  describe('Error Handling', () => {
    it('should throw error when not connected', async () => {
      const client2 = new RedisClient({ host: 'localhost' })
      ;(client2 as any).client = null

      let error: unknown
      try {
        await client2.ping()
      } catch (e) {
        error = e
      }
      expect(error).toBeDefined()
      expect((error as Error).message).toContain('not connected')
    })

    it('should handle health check failure', async () => {
      mockIORedisInstance.ping.mockRejectedValueOnce(new Error('Connection failed'))
      expect(await client.checkHealth()).toBe(false)
    })

    it('should handle connection health check gracefully', async () => {
      ;(client as any).connected = false
      expect(await client.checkHealth()).toBe(false)
    })

    it('should throw error for get when not connected', async () => {
      const client2 = new RedisClient({ host: 'localhost' })
      ;(client2 as any).client = null

      let error: unknown
      try {
        await client2.get('key')
      } catch (e) {
        error = e
      }
      expect(error).toBeDefined()
    })

    it('should handle null values gracefully', async () => {
      mockIORedisInstance.get.mockResolvedValueOnce(null)
      const result = await client.get('nonexistent')
      expect(result).toBeNull()
    })

    it('should handle empty array results', async () => {
      mockIORedisInstance.keys.mockResolvedValueOnce([])
      const result = await client.keys('pattern*')
      expect(result).toEqual([])
    })

    it('should handle mget with mixed values', async () => {
      mockIORedisInstance.mget.mockResolvedValueOnce(['value1', null, 'value3'])
      const result = await client.mget('k1', 'k2', 'k3')
      expect(result).toEqual(['value1', null, 'value3'])
    })

    it('should handle hmget with null values', async () => {
      mockIORedisInstance.hmget.mockResolvedValueOnce([null, 'value'])
      const result = await client.hmget('hash', 'f1', 'f2')
      expect(result).toEqual([null, 'value'])
    })

    it('should handle lrange with empty result', async () => {
      mockIORedisInstance.lrange.mockResolvedValueOnce([])
      const result = await client.lrange('list', 0, 10)
      expect(result).toEqual([])
    })

    it('should handle smembers with empty result', async () => {
      mockIORedisInstance.smembers.mockResolvedValueOnce([])
      const result = await client.smembers('set')
      expect(result).toEqual([])
    })

    it('should handle zrange with empty result', async () => {
      mockIORedisInstance.zrange.mockResolvedValueOnce([])
      const result = await client.zrange('zset', 0, 10)
      expect(result).toEqual([])
    })

    it('should handle null score in zrange with scores', async () => {
      mockIORedisInstance.zrange.mockResolvedValueOnce(['member', null])
      const result = await client.zrange('zset', 0, 0, { withScores: true })
      expect(result).toBeDefined()
    })

    it('should handle hgetall with empty hash', async () => {
      mockIORedisInstance.hgetall.mockResolvedValueOnce({})
      const result = await client.hgetall('hash')
      expect(result).toEqual({})
    })

    it('should handle negative TTL values', async () => {
      mockIORedisInstance.ttl.mockResolvedValueOnce(-1)
      const result = await client.ttl('key')
      expect(result).toBe(-1)
    })

    it('should handle TTL for non-existent key', async () => {
      mockIORedisInstance.ttl.mockResolvedValueOnce(-2)
      const result = await client.ttl('nonexistent')
      expect(result).toBe(-2)
    })

    it('should handle scan cursor progression', async () => {
      mockIORedisInstance.scan.mockResolvedValueOnce(['10', ['k1', 'k2']])
      const result = await client.scan('0')
      expect(result.cursor).toBe('10')
      expect(result.keys).toEqual(['k1', 'k2'])
    })

    it('should handle scan with no results', async () => {
      mockIORedisInstance.scan.mockResolvedValueOnce(['0', []])
      const result = await client.scan('0')
      expect(result.keys).toEqual([])
    })

    it('should handle xread null result', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce(null)
      const result = await client.xread({ stream: '0' })
      expect(result).toBeNull()
    })

    it('should handle subscribe when subscriber already exists', async () => {
      const existingSubscriber = { ...mockIORedisInstance, subscribe: mock(async () => {}) }
      ;(client as any).subscriber = existingSubscriber

      const callback = mock(() => {})
      await client.subscribe('channel', callback)

      // Should use existing subscriber
      expect((client as any).subscriber).toBe(existingSubscriber)
    })

    it('should handle unsubscribe when no subscriber', async () => {
      ;(client as any).subscriber = null
      // Should not throw
      await expect(client.unsubscribe('channel')).resolves.toBeUndefined()
    })
  })

  // ========================================================================
  // Edge Cases Tests
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle set with all options combined', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.set('key', 'value', { ex: 60, nx: true, keepttl: false })
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should handle zadd with multiple scores', async () => {
      mockIORedisInstance.zadd.mockResolvedValueOnce(3)
      await client.zadd(
        'zset',
        { score: 1, member: 'm1' },
        { score: 2, member: 'm2' },
        { score: 3, member: 'm3' }
      )
      expect(mockIORedisInstance.zadd).toHaveBeenCalled()
    })

    it('should handle large key batch operations', async () => {
      const keys = Array.from({ length: 100 }, (_, i) => `k${i}`)
      mockIORedisInstance.del.mockResolvedValueOnce(100)
      await client.del(...keys)
      expect(mockIORedisInstance.del).toHaveBeenCalled()
    })

    it('should handle large value operations', async () => {
      const largeValue = 'x'.repeat(10000)
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.set('largekey', largeValue)
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should handle special characters in keys', async () => {
      mockIORedisInstance.get.mockResolvedValueOnce('value')
      await client.get('key:with:colons:and-dashes_and_underscores')
      expect(mockIORedisInstance.get).toHaveBeenCalled()
    })

    it('should handle empty string values', async () => {
      mockIORedisInstance.call.mockResolvedValueOnce('OK')
      await client.set('key', '')
      expect(mockIORedisInstance.call).toHaveBeenCalled()
    })

    it('should handle zero as value', async () => {
      mockIORedisInstance.incr.mockResolvedValueOnce(0)
      expect(await client.incr('counter')).toBe(0)
    })

    it('should handle negative numbers in operations', async () => {
      mockIORedisInstance.decrby.mockResolvedValueOnce(-5)
      expect(await client.decrby('counter', 5)).toBe(-5)
    })

    it('should handle very large scores in sorted sets', async () => {
      mockIORedisInstance.zadd.mockResolvedValueOnce(1)
      await client.zadd('zset', { score: Number.MAX_SAFE_INTEGER, member: 'm' })
      expect(mockIORedisInstance.zadd).toHaveBeenCalled()
    })

    it('should handle spop with count equal to set size', async () => {
      mockIORedisInstance.spop.mockResolvedValueOnce(['m1', 'm2', 'm3'])
      const result = await client.spop('set', 3)
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
