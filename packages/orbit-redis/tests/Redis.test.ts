/**
 * Redis Tests
 * @description Unit tests for Redis facade and client
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { Redis, RedisClient, RedisManager } from '../src'

describe('Redis', () => {
  describe('configure', () => {
    it('should accept configuration', () => {
      expect(() => {
        Redis.configure({
          default: 'main',
          connections: {
            main: { host: 'localhost', port: 6379 },
          },
        })
      }).not.toThrow()
    })
  })

  describe('addConnection', () => {
    it('should add a named connection', () => {
      expect(() => {
        Redis.addConnection('test', { host: 'localhost', port: 6379 })
      }).not.toThrow()
    })
  })

  describe('connection', () => {
    beforeEach(() => {
      Redis.configure({
        default: 'main',
        connections: {
          main: { host: 'localhost', port: 6379 },
          cache: { host: 'localhost', port: 6380 },
        },
      })
    })

    it('should return default connection', () => {
      const conn = Redis.connection()
      expect(conn).toBeDefined()
    })

    it('should return named connection', () => {
      const conn = Redis.connection('cache')
      expect(conn).toBeDefined()
    })
  })
})

describe('RedisManager', () => {
  let manager: RedisManager

  beforeEach(() => {
    manager = new RedisManager()
  })

  describe('configure', () => {
    it('should configure connections', () => {
      manager.configure({
        default: 'main',
        connections: {
          main: { host: 'localhost', port: 6379 },
        },
      })
      expect(manager.hasConnection('main')).toBe(true)
    })
  })

  describe('addConnection', () => {
    it('should add a new connection', () => {
      manager.addConnection('test', { host: 'localhost', port: 6379 })
      expect(manager.hasConnection('test')).toBe(true)
    })
  })

  describe('hasConnection', () => {
    it('should return false for non-existent connection', () => {
      expect(manager.hasConnection('nonexistent')).toBe(false)
    })
  })

  describe('connection', () => {
    beforeEach(() => {
      manager.configure({
        default: 'main',
        connections: {
          main: { host: 'localhost', port: 6379 },
        },
      })
    })

    it('should return a RedisClient instance', () => {
      const client = manager.connection('main')
      expect(client).toBeDefined()
      expect(client.get).toBeDefined()
      expect(client.set).toBeDefined()
    })

    it('should return same instance for same connection name', () => {
      const client1 = manager.connection('main')
      const client2 = manager.connection('main')
      expect(client1).toBe(client2)
    })

    it('should throw for unconfigured connection', () => {
      expect(() => manager.connection('unconfigured')).toThrow(
        'Redis connection "unconfigured" not configured'
      )
    })
  })
})

describe('RedisClient', () => {
  describe('constructor', () => {
    it('should create instance with default config', () => {
      const client = new RedisClient()
      expect(client).toBeDefined()
    })

    it('should create instance with custom config', () => {
      const client = new RedisClient({
        host: 'custom.redis.com',
        port: 6380,
        password: 'secret',
        db: 1,
      })
      expect(client).toBeDefined()
    })
  })

  describe('isConnected', () => {
    it('should return false before connect', () => {
      const client = new RedisClient()
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('pipeline', () => {
    it('should create a pipeline', () => {
      const client = new RedisClient()
      // Pipeline requires connection, but we can test creation throws appropriate error
      expect(() => client.pipeline()).toThrow('Redis client not connected')
    })
  })
})

describe('Types', () => {
  it('should export all expected types', async () => {
    const module = await import('../src')
    expect(module.Redis).toBeDefined()
    expect(module.RedisClient).toBeDefined()
    expect(module.RedisManager).toBeDefined()
  })
})
