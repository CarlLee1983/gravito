/**
 * MongoDB Tests
 * @description Unit tests for MongoDB facade and client
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { Mongo, MongoClient, MongoManager } from '../src'

describe('Mongo', () => {
  describe('configure', () => {
    it('should accept configuration', () => {
      expect(() => {
        Mongo.configure({
          default: 'main',
          connections: {
            main: { uri: 'mongodb://localhost:27017', database: 'test' },
          },
        })
      }).not.toThrow()
    })
  })

  describe('addConnection', () => {
    it('should add a named connection', () => {
      expect(() => {
        Mongo.addConnection('analytics', {
          uri: 'mongodb://localhost:27017',
          database: 'analytics',
        })
      }).not.toThrow()
    })
  })

  describe('connection', () => {
    beforeEach(() => {
      Mongo.configure({
        default: 'main',
        connections: {
          main: { uri: 'mongodb://localhost:27017', database: 'test' },
          secondary: { uri: 'mongodb://localhost:27018', database: 'test2' },
        },
      })
    })

    it('should return default connection', () => {
      const conn = Mongo.connection()
      expect(conn).toBeDefined()
    })

    it('should return named connection', () => {
      const conn = Mongo.connection('secondary')
      expect(conn).toBeDefined()
    })
  })
})

describe('MongoManager', () => {
  let manager: MongoManager

  beforeEach(() => {
    manager = new MongoManager()
  })

  describe('configure', () => {
    it('should configure connections', () => {
      manager.configure({
        default: 'main',
        connections: {
          main: { uri: 'mongodb://localhost:27017', database: 'test' },
        },
      })
      expect(manager.hasConnection('main')).toBe(true)
    })
  })

  describe('addConnection', () => {
    it('should add a new connection', () => {
      manager.addConnection('test', { uri: 'mongodb://localhost:27017', database: 'test' })
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
          main: { uri: 'mongodb://localhost:27017', database: 'test' },
        },
      })
    })

    it('should return a MongoClient instance', () => {
      const client = manager.connection('main')
      expect(client).toBeDefined()
      expect(client.collection).toBeDefined()
      expect(client.database).toBeDefined()
    })

    it('should return same instance for same connection name', () => {
      const client1 = manager.connection('main')
      const client2 = manager.connection('main')
      expect(client1).toBe(client2)
    })

    it('should throw for unconfigured connection', () => {
      expect(() => manager.connection('unconfigured')).toThrow(
        'MongoDB connection "unconfigured" not configured'
      )
    })
  })
})

describe('MongoClient', () => {
  describe('constructor', () => {
    it('should create instance with default config', () => {
      const client = new MongoClient()
      expect(client).toBeDefined()
    })

    it('should create instance with custom config', () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'myapp',
        maxPoolSize: 20,
      })
      expect(client).toBeDefined()
    })

    it('should create instance with host/port config', () => {
      const client = new MongoClient({
        host: 'mongo.example.com',
        port: 27017,
        database: 'myapp',
        username: 'user',
        password: 'pass',
      })
      expect(client).toBeDefined()
    })
  })

  describe('isConnected', () => {
    it('should return false before connect', () => {
      const client = new MongoClient()
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('collection', () => {
    it('should throw when not connected', () => {
      const client = new MongoClient()
      expect(() => client.collection('users')).toThrow('MongoDB client not connected')
    })
  })
})

describe('Types', () => {
  it('should export all expected types', async () => {
    const module = await import('../src')
    expect(module.Mongo).toBeDefined()
    expect(module.MongoClient).toBeDefined()
    expect(module.MongoManager).toBeDefined()
    expect(module.MongoQueryBuilder).toBeDefined()
    expect(module.MongoAggregateBuilder).toBeDefined()
  })
})
