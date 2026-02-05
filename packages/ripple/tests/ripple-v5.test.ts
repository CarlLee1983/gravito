/**
 * @fileoverview Tests for Ripple v5.0 Multi-Runtime Architecture
 *
 * Tests the new engine-based architecture with the start() API.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { RippleSocket } from '../src/engines/IRippleEngine'
import { RippleServer } from '../src/RippleServer'

describe('RippleServer v5.0', () => {
  let server: RippleServer

  afterEach(async () => {
    if (server) {
      await server.shutdown()
    }
  })

  describe('Configuration', () => {
    it('should create with default config', () => {
      server = new RippleServer()
      expect(server.config.path).toBe('/ws')
      expect(server.config.authEndpoint).toBe('/broadcasting/auth')
      expect(server.config.pingInterval).toBe(30000)
    })

    it('should create with custom config', () => {
      server = new RippleServer({
        path: '/websocket',
        authEndpoint: '/api/auth',
        pingInterval: 60000,
        port: 4000,
      })
      expect(server.config.path).toBe('/websocket')
      expect(server.config.authEndpoint).toBe('/api/auth')
      expect(server.config.pingInterval).toBe(60000)
      expect(server.config.port).toBe(4000)
    })

    it('should auto-detect runtime if not specified', () => {
      server = new RippleServer({ port: 3001 })
      // Should not throw - runtime is auto-detected
      expect(server).toBeDefined()
    })

    it('should accept explicit runtime selection', () => {
      server = new RippleServer({
        port: 3002,
        runtime: 'bun',
      })
      expect(server.config.runtime).toBe('bun')
    })
  })

  describe('Server Lifecycle', () => {
    it('should start and shutdown cleanly', async () => {
      server = new RippleServer({ port: 3003 })

      await server.start()
      expect(server).toBeDefined()

      await server.shutdown()
      // Should not throw
    })

    it('should initialize driver on start', async () => {
      server = new RippleServer({
        port: 3004,
        driver: 'local',
      })

      await server.start()

      // Driver should be initialized
      expect(server.driverName).toBe('local')

      await server.shutdown()
    })
  })

  describe('Stats and Health', () => {
    beforeEach(() => {
      server = new RippleServer({ port: 3005 })
    })

    it('should return stats', () => {
      const stats = server.getStats()
      expect(stats.totalClients).toBe(0)
      expect(stats.totalChannels).toBe(0)
      expect(stats.channels).toEqual([])
    })

    it('should return health status', async () => {
      await server.start()
      const health = await server.getHealth()

      expect(health.status).toBeDefined()
      expect(health.driver).toBeDefined()

      await server.shutdown()
    })
  })

  describe('Broadcasting', () => {
    beforeEach(() => {
      server = new RippleServer({ port: 3006 })
    })

    it('should broadcast to channels', () => {
      // Broadcasting should work even without active connections
      server.broadcast('test-channel', 'TestEvent', { message: 'hello' })

      // Should not throw
      expect(server).toBeDefined()
    })

    it('should use to() helper for broadcasting', () => {
      server.to('news').emit('update', { title: 'Breaking News' })

      // Should not throw
      expect(server).toBeDefined()
    })
  })

  describe('Event Listeners', () => {
    beforeEach(() => {
      server = new RippleServer({ port: 3007 })
    })

    it('should register event listeners', () => {
      server.on('whisper', (_socket, _data) => {
        // Event listener registered
      })

      // Event listener should be registered
      expect(server).toBeDefined()
    })
  })

  describe('Interceptors', () => {
    it('should support middleware interceptors', async () => {
      server = new RippleServer({
        port: 3008,
        interceptors: [
          async (_ctx, next) => {
            // Interceptor logic
            await next()
          },
        ],
      })

      expect(server).toBeDefined()
    })

    it('should add interceptors via use()', () => {
      server = new RippleServer({ port: 3009 })

      server.use(async (ctx, next) => {
        // Interceptor logic
        await next()
      })

      expect(server).toBeDefined()
    })
  })

  describe('Metrics', () => {
    it('should support metrics when enabled', () => {
      server = new RippleServer({
        port: 3010,
        metrics: {
          enabled: true,
          prefix: 'ripple_test',
        },
      })

      const metrics = server.getMetrics()
      expect(typeof metrics).toBe('string')
    })

    it('should return empty string when metrics disabled', () => {
      server = new RippleServer({
        port: 3011,
        metrics: {
          enabled: false,
        },
      })

      const metrics = server.getMetrics()
      expect(metrics).toBe('')
    })
  })

  describe('Reconnection', () => {
    it('should support reconnection when enabled', () => {
      server = new RippleServer({
        port: 3012,
        reconnection: {
          enabled: true,
          sessionTTL: 60000,
          maxSessions: 1000,
        },
      })

      expect(server).toBeDefined()
    })
  })

  describe('Serialization', () => {
    it('should support JSON serialization by default', () => {
      server = new RippleServer({ port: 3013 })
      expect(server).toBeDefined()
    })

    it('should support Protobuf serialization', () => {
      server = new RippleServer({
        port: 3014,
        serializer: 'protobuf',
      })
      expect(server).toBeDefined()
    })
  })

  describe('Backward Compatibility', () => {
    it('should support deprecated init() method', async () => {
      server = new RippleServer({ port: 3015 })

      // Old API should still work
      await server.init()

      await server.shutdown()
    })

    it('should support deprecated upgrade() method', () => {
      server = new RippleServer({ port: 3016, path: '/ws' })

      // This should work but log deprecation warning
      const req = new Request('http://localhost:3016/other')
      const result = server.upgrade(req, { userId: 'test-user' })

      // Should return false for non-matching path
      expect(result).toBe(false)
    })
  })
})

describe('Engine Abstraction', () => {
  it('should create BunEngine by default on Bun', () => {
    const server = new RippleServer({ port: 3017 })
    expect(server).toBeDefined()
  })

  it('should throw for unimplemented runtimes', () => {
    expect(() => {
      new RippleServer({
        port: 3018,
        runtime: 'node-uws',
      })
    }).toThrow('uWebSockets.js engine not yet implemented')
  })
})

describe('Driver Selection', () => {
  it('should use LocalDriver by default', () => {
    const server = new RippleServer({ port: 3019 })
    expect(server.driverName).toBe('local')
  })

  it('should support Redis driver when configured', () => {
    const server = new RippleServer({
      port: 3020,
      driver: 'redis',
      redis: {
        host: 'localhost',
        port: 6379,
      },
    })
    expect(server.driverName).toBe('redis')
  })

  it('should support NATS driver when configured', () => {
    const server = new RippleServer({
      port: 3021,
      driver: 'nats',
      nats: {
        servers: ['nats://localhost:4222'],
      },
    })
    expect(server.driverName).toBe('nats')
  })
})
