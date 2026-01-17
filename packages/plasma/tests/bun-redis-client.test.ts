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
      expect(mockRedisInstance.send).toHaveBeenCalled()
      const args = mockRedisInstance.send.mock.lastCall
      if (args) {
        expect(args[0]).toEqual(['APPEND', 'key', 'value'])
      }
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
      expect(mockRedisInstance.send).toHaveBeenCalled()
      const args = mockRedisInstance.send.mock.lastCall
      if (args) {
        expect(args[0]).toEqual(['LPUSH', 'key', 'val'])
      }
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

      expect(mockRedisInstance.set).toHaveBeenCalledWith('k1', 'v1', expect.any(Object))
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
})
