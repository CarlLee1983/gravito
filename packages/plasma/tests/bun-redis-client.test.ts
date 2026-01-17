import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { BunRedisClient } from '../src/clients/BunRedisClient'

// Mock Redis implementation
// biome-ignore lint/suspicious/noExplicitAny: Mocking requirements
const mockRedisInstance: any = {
  connect: mock(async function (this: any) {
    this.connected = true
  }),
  close: mock(async function (this: any) {
    this.connected = false
  }),
  connected: false,
  get: mock(async () => null),
  set: mock(async () => 'OK'),
  del: mock(async () => 1),
  exists: mock(async () => true),
  incr: mock(async () => 1),
  decr: mock(async () => 0),
  hget: mock(async () => 'value'),
  hset: mock(async () => 1),
  hgetall: mock(async () => ({ field: 'value' })),
  lpush: mock(async () => 1),
  rpop: mock(async () => 'value'),
  sadd: mock(async () => 1),
  smembers: mock(async () => ['member']),
  send: mock(async () => 'OK'), // Generic mock for send
  publish: mock(async () => 1),
  subscribe: mock(async () => {
    /* empty */
  }),
  unsubscribe: mock(async () => {
    /* empty */
  }),
  // Additional methods that might be called
  expire: mock(async () => 1),
  ttl: mock(async () => 60),
  // New mocks for coverage
  expireat: mock(async () => 1),
  type: mock(async () => 'string'),
  rename: mock(async () => 'OK'),
  renamenx: mock(async () => 1),
  keys: mock(async () => ['k1', 'k2']),
  scan: mock(async () => [0, ['k1']]),
  flushdb: mock(async () => 'OK'),
  flushall: mock(async () => 'OK'),
  dbsize: mock(async () => 100),
  info: mock(async () => '# Info'),
  mget: mock(async () => ['v1', 'v2']),
  mset: mock(async () => 'OK'),
  incrby: mock(async () => 5),
  decrby: mock(async () => 2),
  getset: mock(async () => 'old'),
  strlen: mock(async () => 5),
  srem: mock(async () => 1),
  sismember: mock(async () => 1), // Bun returns 1/0 (or boolean? Bun is boolean, wrapper converts)
  scard: mock(async () => 5),
  spop: mock(async () => 'm1'),
  srandmember: mock(async () => 'm1'),
  sunion: mock(async () => ['m1']),
  sinter: mock(async () => ['m1']),
  sdiff: mock(async () => ['m1']),
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
  hdel: mock(async () => 1),
  hexists: mock(async () => 1),
  hmget: mock(async () => ['v1']),
  hmset: mock(async () => 'OK'),
  hincrby: mock(async () => 1),
  pexpire: mock(async () => 1),
  pttl: mock(async () => 1000),
  persist: mock(async () => 1),
}

const MockRedisClient = class {
  constructor() {
    Object.assign(this, mockRedisInstance)
  }
}

// Subclass for testing to inject mock
class TestBunRedisClient extends BunRedisClient {
  // biome-ignore lint/suspicious/noExplicitAny: Mocking requirements
  protected async getRedisClientClass(): Promise<any> {
    return MockRedisClient
  }
}

describe('BunRedisClient', () => {
  let client: BunRedisClient

  beforeEach(() => {
    client = new TestBunRedisClient({
      host: 'localhost',
      port: 6379,
    })

    // Reset mocks
    Object.values(mockRedisInstance).forEach((m) => {
      // @ts-expect-error - Iterate over mixed types of mocks and values
      if (typeof m?.mockClear === 'function') {
        // @ts-expect-error - Call mockClear if it exists
        m.mockClear()
      }
    })
    mockRedisInstance.connected = false
    mockRedisInstance.exists.mockResolvedValue(true) // Default to true for boolean conversion tests
    mockRedisInstance.set.mockResolvedValue('OK')
    mockRedisInstance.get.mockResolvedValue(null)
    mockRedisInstance.send.mockResolvedValue('OK')
  })

  afterEach(async () => {
    await client.disconnect()
  })

  describe('Connection', () => {
    it('should connect to redis', async () => {
      await client.connect()
      expect(mockRedisInstance.connect).toHaveBeenCalled()
      expect(client.isConnected()).toBe(true)
    })

    it('should disconnect from redis', async () => {
      await client.connect()
      await client.disconnect()
      expect(mockRedisInstance.close).toHaveBeenCalled()
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('String Operations', () => {
    beforeEach(async () => {
      await client.connect()
    })

    it('get should return value', async () => {
      mockRedisInstance.get.mockResolvedValueOnce('test-value')
      const result = await client.get('key')
      expect(result).toBe('test-value')
      expect(mockRedisInstance.get).toHaveBeenCalledWith('key')
    })

    it('set should return OK', async () => {
      mockRedisInstance.set.mockResolvedValueOnce('OK')
      const result = await client.set('key', 'value')
      expect(result).toBe('OK')
      expect(mockRedisInstance.set).toHaveBeenCalled()
      const args = mockRedisInstance.set.mock.lastCall
      if (args) {
        expect(args[0]).toBe('key')
        expect(args[1]).toBe('value')
      }
    })

    it('exists should convert boolean to number', async () => {
      // Mock Bun returning boolean true
      mockRedisInstance.exists.mockResolvedValueOnce(true)
      const result = await client.exists('key')
      expect(result).toBe(1)

      // Mock Bun returning boolean false
      mockRedisInstance.exists.mockResolvedValueOnce(false)
      const result2 = await client.exists('key')
      expect(result2).toBe(0)
    })

    it('append should use send command', async () => {
      mockRedisInstance.send.mockResolvedValueOnce(5)
      const result = await client.append('key', 'value')
      expect(result).toBe(5)
      // Verify array argument
      expect(mockRedisInstance.send).toHaveBeenCalledWith('APPEND', ['key', 'value'])
    })
  })

  describe('Hash Operations', () => {
    beforeEach(async () => {
      await client.connect()
    })

    it('hgetall should return object', async () => {
      const data = { field: 'value' }
      mockRedisInstance.hgetall.mockResolvedValueOnce(data)
      const result = await client.hgetall('key')
      expect(result).toEqual(data)
    })

    it('hset should handle object', async () => {
      mockRedisInstance.hset.mockResolvedValueOnce(2)
      const result = await client.hset('key', { f1: 'v1', f2: 'v2' })
      expect(result).toBe(2)
      expect(mockRedisInstance.hset).toHaveBeenCalled()
    })
  })

  describe('List Operations', () => {
    beforeEach(async () => {
      await client.connect()
    })

    it('lpush should use send command', async () => {
      mockRedisInstance.send.mockResolvedValueOnce(1)
      const result = await client.lpush('key', 'val')
      expect(result).toBe(1)
      expect(mockRedisInstance.send).toHaveBeenCalledWith('LPUSH', ['key', 'val'])
    })
  })

  describe('Pipeline', () => {
    beforeEach(async () => {
      await client.connect()
    })

    it('should execute pipeline commands', async () => {
      const pipeline = client.pipeline()
      pipeline.set('k1', 'v1')
      pipeline.get('k1')

      // Since pipeline uses this.client directly (which is our mock instance),
      // calling exec() will invoke calls on our mock instance.
      // We assume sequential execution in our mock calls setup.

      mockRedisInstance.set.mockResolvedValueOnce('OK')
      mockRedisInstance.get.mockResolvedValueOnce('v1')

      const results = await pipeline.exec()

      // Verification
      expect(results).toHaveLength(2)
      expect(results[0]).toEqual([null, 'OK'])
      expect(results[1]).toEqual([null, 'v1'])

      // Updated: set implementation with no options calls set(key, value)
      expect(mockRedisInstance.set).toHaveBeenCalledWith('k1', 'v1')
      expect(mockRedisInstance.get).toHaveBeenCalledWith('k1')
    })
  })

  describe('Pub/Sub', () => {
    it('should create separate connection for subscription', async () => {
      // Connect main client
      await client.connect()
      mockRedisInstance.connect.mockClear() // Clear initial connect call

      // Subscribe
      await client.subscribe('chan', () => {
        /* empty */
      })

      // Should have connected again (for subscriber)
      expect(mockRedisInstance.connect).toHaveBeenCalled()
      expect(mockRedisInstance.subscribe).toHaveBeenCalled()
    })
  })

  // Additional Test Suites for Coverage

  describe('Key Operations', () => {
    beforeEach(async () => await client.connect())

    it('should handle keys pattern', async () => {
      await client.keys('*')
      expect(mockRedisInstance.send).toHaveBeenCalledWith('KEYS', ['*'])
    })

    it('should handle scan', async () => {
      // Bun returns [cursor, keys[]]
      mockRedisInstance.send.mockResolvedValueOnce(['10', ['key1']])
      const res = await client.scan('0')
      expect(res).toEqual({ cursor: '10', keys: ['key1'] })
    })

    it('should handle scan options', async () => {
      mockRedisInstance.send.mockResolvedValueOnce(['0', []])
      await client.scan('0', { match: 'user:*', count: 100 })
      expect(mockRedisInstance.send).toHaveBeenCalledWith('SCAN', [
        '0',
        'MATCH',
        'user:*',
        'COUNT',
        '100',
      ])
    })

    it('should handle type', async () => {
      mockRedisInstance.send.mockResolvedValueOnce('string')
      const t = await client.type('key')
      expect(t).toBe('string')
    })
  })

  describe('Set Operations (Extended)', () => {
    beforeEach(async () => await client.connect())

    it('sismember should return number', async () => {
      // sismember uses direct client call, NOT sendCommand
      mockRedisInstance.sismember.mockResolvedValueOnce(true)
      expect(await client.sismember('s', 'm')).toBe(1)
      mockRedisInstance.sismember.mockResolvedValueOnce(false)
      expect(await client.sismember('s', 'm')).toBe(0)
    })

    it('spop should handle count', async () => {
      // spop uses sendCommand when count is provided
      // Single (no count) -> calls client.spop directly
      mockRedisInstance.spop.mockResolvedValueOnce('m1')
      expect(await client.spop('s')).toBe('m1')

      // Multiple (with count) -> calls sendCommand('SPOP', ...)
      mockRedisInstance.send.mockResolvedValueOnce(['m1', 'm2'])
      expect(await client.spop('s', 2)).toEqual(['m1', 'm2'])
    })

    it('scard should return count', async () => {
      // scard uses sendCommand
      mockRedisInstance.send.mockResolvedValueOnce(3)
      expect(await client.scard('s')).toBe(3)
    })

    it('set algebra', async () => {
      // sunion/sinter/sdiff use sendCommand
      mockRedisInstance.send.mockResolvedValueOnce(['a', 'b'])
      expect(await client.sunion('s1', 's2')).toEqual(['a', 'b'])

      mockRedisInstance.send.mockResolvedValueOnce(['a'])
      expect(await client.sinter('s1', 's2')).toEqual(['a'])

      mockRedisInstance.send.mockResolvedValueOnce(['b'])
      expect(await client.sdiff('s1', 's2')).toEqual(['b'])
    })
  })

  describe('String Operations (Extended)', () => {
    beforeEach(async () => await client.connect())

    it('should handle incr/decr family', async () => {
      // incr/decr use direct client calls in general, BUT standard RedisClientContract methods
      // often map to specific client methods in BunRedisClient.
      // Checking BunRedisClient.ts:
      // incr/decr/incrby/decrby use this.getClient().incr etc.
      mockRedisInstance.incr.mockResolvedValueOnce(2)
      expect(await client.incr('k')).toBe(2)

      mockRedisInstance.incrby.mockResolvedValueOnce(5)
      expect(await client.incrby('k', 3)).toBe(5)

      mockRedisInstance.decr.mockResolvedValueOnce(1)
      expect(await client.decr('k')).toBe(1)

      mockRedisInstance.decrby.mockResolvedValueOnce(0)
      expect(await client.decrby('k', 1)).toBe(0)
    })

    it('should handle mget/mset', async () => {
      // mget/mset use sendCommand
      mockRedisInstance.send.mockResolvedValueOnce(['v1', 'v2'])
      expect(await client.mget('k1', 'k2')).toEqual(['v1', 'v2'])

      mockRedisInstance.send.mockResolvedValueOnce('OK')
      expect(await client.mset({ k1: 'v1' })).toBe('OK')
    })

    it('should handle getset', async () => {
      // getset uses sendCommand
      mockRedisInstance.send.mockResolvedValueOnce('old')
      expect(await client.getset('k', 'new')).toBe('old')
    })

    it('should handle ttl/expire', async () => {
      // ttl use direct call, expire uses direct call
      mockRedisInstance.expire.mockResolvedValueOnce(1)
      expect(await client.expire('k', 10)).toBe(1)

      mockRedisInstance.ttl.mockResolvedValueOnce(60)
      expect(await client.ttl('k')).toBe(60)

      // expireat, pexpire, pttl, persist use sendCommand
      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.expireat('k', 1234567890)).toBe(1)

      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.pexpire('k', 1000)).toBe(1)

      mockRedisInstance.send.mockResolvedValueOnce(1000)
      expect(await client.pttl('k')).toBe(1000)

      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.persist('k')).toBe(1)
    })
  })

  describe('Sorted Set Operations', () => {
    beforeEach(async () => await client.connect())

    it('zadd should handle options', async () => {
      // zadd calls sendCommand('ZADD', ...)
      mockRedisInstance.send.mockResolvedValueOnce(1)
      await client.zadd('z', { score: 1, member: 'm1' })
      expect(mockRedisInstance.send).toHaveBeenCalledWith(
        'ZADD',
        expect.arrayContaining(['z', '1', 'm1'])
      )
    })

    it('zrange should return array', async () => {
      mockRedisInstance.send.mockResolvedValueOnce(['m1', 'm2'])
      const res = await client.zrange('z', 0, -1)
      expect(res).toEqual(['m1', 'm2'])
    })

    it('zrange with scores should flatten', async () => {
      // Bun returns flattened array when using raw client.send? Or nested?
      // BunRedisClient checks: if (options?.withScores && Array.isArray(result)) return result.flat().map(String)
      // We simulate Bun returning a nested structure or flat one that needs flattening?
      // Actually, if we mock it returning [['m1', '1']], .flat() becomes ['m1', '1'].
      mockRedisInstance.send.mockResolvedValueOnce([['m1', '1']])
      const res = await client.zrange('z', 0, -1, { withScores: true })
      expect(res).toEqual(['m1', '1'])
    })

    it('zcard should return count', async () => {
      mockRedisInstance.send.mockResolvedValueOnce(5)
      expect(await client.zcard('z')).toBe(5)
    })

    it('zcount should return count', async () => {
      mockRedisInstance.send.mockResolvedValueOnce(2)
      expect(await client.zcount('z', 0, 10)).toBe(2)
    })
  })

  describe('Server Operations', () => {
    beforeEach(async () => await client.connect())

    it('should flushdb', async () => {
      await client.flushdb()
      expect(mockRedisInstance.send).toHaveBeenCalledWith('FLUSHDB', [])
    })

    it('should info', async () => {
      await client.info()
      expect(mockRedisInstance.send).toHaveBeenCalledWith('INFO', [])
    })
  })

  describe('List Operations (Extended)', () => {
    beforeEach(async () => await client.connect())

    it('should handle list basics', async () => {
      mockRedisInstance.send.mockResolvedValueOnce('v1')
      expect(await client.lpop('k')).toBe('v1')

      mockRedisInstance.send.mockResolvedValueOnce('v2')
      expect(await client.rpop('k')).toBe('v2')

      mockRedisInstance.send.mockResolvedValueOnce(5)
      expect(await client.llen('k')).toBe(5)

      mockRedisInstance.send.mockResolvedValueOnce('v3')
      expect(await client.lindex('k', 1)).toBe('v3')

      mockRedisInstance.send.mockResolvedValueOnce('OK')
      expect(await client.lset('k', 1, 'vnew')).toBe('OK')

      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.lrem('k', 0, 'v')).toBe(1)

      mockRedisInstance.send.mockResolvedValueOnce('OK')
      expect(await client.ltrim('k', 0, 1)).toBe('OK')

      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.rpush('k', 'v')).toBe(1)
    })

    it('should handle lrange', async () => {
      mockRedisInstance.send.mockResolvedValueOnce(['v1', 'v2'])
      expect(await client.lrange('k', 0, -1)).toEqual(['v1', 'v2'])
    })
  })

  describe('Hash Operations (Extended)', () => {
    beforeEach(async () => await client.connect())

    it('should handle hmget/hmset', async () => {
      mockRedisInstance.hmget.mockResolvedValueOnce(['v1', 'v2'])
      expect(await client.hmget('k', 'f1', 'f2')).toEqual(['v1', 'v2'])

      // hmset uses sendCommand('HMSET', ...)
      mockRedisInstance.send.mockResolvedValueOnce('OK')
      expect(await client.hmset('k', { f1: 'v1' })).toBe('OK')
    })

    it('should handle hincrby', async () => {
      // hincrby uses direct client call
      mockRedisInstance.hincrby.mockResolvedValueOnce(5)
      expect(await client.hincrby('k', 'f', 1)).toBe(5)
    })

    it('should handle hdel, hexists, hkeys, hvals, hlen', async () => {
      // hdel uses direct client call
      mockRedisInstance.hdel.mockResolvedValueOnce(1)
      expect(await client.hdel('k', 'f')).toBe(1)

      // hexists uses sendCommand
      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.hexists('k', 'f')).toBe(1)

      // hkeys, hvals, hlen use sendCommand
      mockRedisInstance.send.mockResolvedValueOnce(['f1'])
      expect(await client.hkeys('k')).toEqual(['f1'])

      mockRedisInstance.send.mockResolvedValueOnce(['v1'])
      expect(await client.hvals('k')).toEqual(['v1'])

      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.hlen('k')).toBe(1)
    })
  })

  describe('Sorted Set (More)', () => {
    beforeEach(async () => await client.connect())

    it('should handle zrem/zscore', async () => {
      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.zrem('z', 'm')).toBe(1)

      mockRedisInstance.send.mockResolvedValueOnce('1.5')
      expect(await client.zscore('z', 'm')).toBe('1.5')
    })

    it('should handle ranks', async () => {
      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.zrank('z', 'm')).toBe(1)

      mockRedisInstance.send.mockResolvedValueOnce(2)
      expect(await client.zrevrank('z', 'm')).toBe(2)
    })

    it('should handle zincrby', async () => {
      mockRedisInstance.send.mockResolvedValueOnce('3.5')
      expect(await client.zincrby('z', 1.5, 'm')).toBe('3.5')
    })

    it('should handle zrevrange', async () => {
      mockRedisInstance.send.mockResolvedValueOnce(['m2', 'm1'])
      expect(await client.zrevrange('z', 0, -1)).toEqual(['m2', 'm1'])
    })
  })

  describe('Server/Key (More)', () => {
    beforeEach(async () => await client.connect())

    it('should handle server info', async () => {
      await client.flushall()
      expect(mockRedisInstance.send).toHaveBeenCalledWith('FLUSHALL', [])

      mockRedisInstance.send.mockResolvedValueOnce(10)
      expect(await client.dbsize()).toBe(10)
    })

    it('should handle rename', async () => {
      mockRedisInstance.send.mockResolvedValueOnce('OK')
      expect(await client.rename('k1', 'k2')).toBe('OK')

      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.renamenx('k1', 'k2')).toBe(1)
    })

    it('should handle pexpire/pttl/persist/strlen', async () => {
      // pexpire, pttl, persist use sendCommand
      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.pexpire('k', 1000)).toBe(1)

      mockRedisInstance.send.mockResolvedValueOnce(1000)
      expect(await client.pttl('k')).toBe(1000)

      mockRedisInstance.send.mockResolvedValueOnce(1)
      expect(await client.persist('k')).toBe(1)

      mockRedisInstance.send.mockResolvedValueOnce(5)
      expect(await client.strlen('k')).toBe(5)
    })

    it('should handle info and publish', async () => {
      mockRedisInstance.send.mockResolvedValueOnce('# info')
      expect(await client.info()).toBe('# info')

      mockRedisInstance.publish.mockResolvedValueOnce(1)
      expect(await client.publish('ch', 'msg')).toBe(1)
    })
  })

  describe('Pipeline (Extended)', () => {
    beforeEach(async () => await client.connect())

    it('should handle all pipeline methods', async () => {
      const p = client.pipeline()
      p.incr('k').decr('k').hget('h', 'f').hset('h', 'f', 'v').hgetall('h')
      p.lpush('l', 'v').rpush('l', 'v').lpop('l').rpop('l')
      p.sadd('s', 'm').srem('s', 'm').smembers('s').sismember('s', 'm').scard('s')

      mockRedisInstance.send.mockResolvedValue(['res'])
      const results = await p.exec()
      expect(results).toHaveLength(14)
    })
  })
})
