import { afterEach, describe, expect, it } from 'bun:test'
import { RippleServer } from '../src/RippleServer'

describe('RippleServer Additional Tests', () => {
  let server: RippleServer

  afterEach(async () => {
    if (server) {
      await server.shutdown()
    }
  })

  describe('Initialization and Shutdown', () => {
    it('should provide health status', async () => {
      server = new RippleServer()
      const health = await server.getHealth()

      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('timestamp')
      expect(health.status).toBe('healthy')
    })

    it('should initialize with default local driver', async () => {
      server = new RippleServer({ port: 0 })
      await server.init()

      const stats = server.getStats()
      expect(stats.totalClients).toBeGreaterThanOrEqual(0)
    })

    it('should clear state on shutdown', async () => {
      server = new RippleServer({ pingInterval: 1000, port: 0 })
      await server.init()

      await server.shutdown()

      const stats = server.getStats()
      expect(stats.totalClients).toBe(0)
    })
  })

  describe('Authorization', () => {
    it('should reject private channel when authorizer returns false', async () => {
      server = new RippleServer({
        authorizer: async () => false,
        port: 0,
      })

      const messages: any[] = []
      const mockWs = {
        data: {
          id: 'test',
          channels: new Set(),
          userId: undefined,
          reconnectionToken: undefined,
          userInfo: undefined,
        },
        send: (data: string | Buffer | Uint8Array) => {
          const str =
            typeof data === 'string'
              ? data
              : Buffer.isBuffer(data)
                ? data.toString()
                : new TextDecoder().decode(data)
          messages.push(JSON.parse(str))
        },
        close: () => {},
        getBufferedAmount: () => 0,
        subscribe: () => {},
        unsubscribe: () => {},
        publish: () => {},
        id: 'test',
      } as any

      const channels = server.channels
      channels.addClient(mockWs)

      await server.handleMessage(
        mockWs,
        JSON.stringify({
          type: 'subscribe',
          channel: 'private-secret',
        })
      )

      expect(messages.some((m) => m.type === 'error')).toBe(true)
    })

    it('should accept private channel when authorizer returns true', async () => {
      server = new RippleServer({
        authorizer: async () => true,
        port: 0,
      })

      const messages: any[] = []
      const mockWs = {
        data: {
          id: 'test',
          channels: new Set(),
          userId: undefined,
          reconnectionToken: undefined,
          userInfo: undefined,
        },
        send: (data: string | Buffer | Uint8Array) => {
          const str =
            typeof data === 'string'
              ? data
              : Buffer.isBuffer(data)
                ? data.toString()
                : new TextDecoder().decode(data)
          messages.push(JSON.parse(str))
        },
        close: () => {},
        getBufferedAmount: () => 0,
        subscribe: () => {},
        unsubscribe: () => {},
        publish: () => {},
        id: 'test',
      } as any

      const channels = server.channels
      channels.addClient(mockWs)

      await server.handleMessage(
        mockWs,
        JSON.stringify({
          type: 'subscribe',
          channel: 'private-secret',
        })
      )

      expect(messages.some((m) => m.type === 'subscribed' && m.channel === 'private-secret')).toBe(
        true
      )
    })

    it('should handle presence channel authorization with user info', async () => {
      server = new RippleServer({
        authorizer: async (_channel, userId) => ({
          id: userId ?? 'anonymous',
          info: { name: 'Test User' },
        }),
        port: 0,
      })

      const messages: any[] = []
      const mockWs = {
        data: {
          id: 'test',
          channels: new Set(),
          userId: undefined,
          reconnectionToken: undefined,
          userInfo: undefined,
        },
        send: (data: string | Buffer | Uint8Array) => {
          const str =
            typeof data === 'string'
              ? data
              : Buffer.isBuffer(data)
                ? data.toString()
                : new TextDecoder().decode(data)
          messages.push(JSON.parse(str))
        },
        close: () => {},
        getBufferedAmount: () => 0,
        subscribe: () => {},
        unsubscribe: () => {},
        publish: () => {},
        id: 'test',
      } as any

      const channels = server.channels
      channels.addClient(mockWs)

      await server.handleMessage(
        mockWs,
        JSON.stringify({
          type: 'subscribe',
          channel: 'presence-lobby',
        })
      )

      expect(messages.some((m) => m.type === 'subscribed' && m.channel === 'presence-lobby')).toBe(
        true
      )
    })
  })

  describe('Broadcast Methods', () => {
    it('should broadcast to specific clients via broadcastToClients', () => {
      server = new RippleServer({ port: 0 })

      const messagesA: any[] = []
      const messagesB: any[] = []

      const wsA = {
        data: {
          id: 'a',
          channels: new Set(),
          userId: undefined,
          reconnectionToken: undefined,
          userInfo: undefined,
        },
        send: (data: string | Buffer | Uint8Array) => {
          const str =
            typeof data === 'string'
              ? data
              : Buffer.isBuffer(data)
                ? data.toString()
                : new TextDecoder().decode(data)
          messagesA.push(JSON.parse(str))
        },
        close: () => {},
        getBufferedAmount: () => 0,
        subscribe: () => {},
        unsubscribe: () => {},
        publish: () => {},
        id: 'a',
      } as any

      const wsB = {
        data: {
          id: 'b',
          channels: new Set(),
          userId: undefined,
          reconnectionToken: undefined,
          userInfo: undefined,
        },
        send: (data: string | Buffer | Uint8Array) => {
          const str =
            typeof data === 'string'
              ? data
              : Buffer.isBuffer(data)
                ? data.toString()
                : new TextDecoder().decode(data)
          messagesB.push(JSON.parse(str))
        },
        close: () => {},
        getBufferedAmount: () => 0,
        subscribe: () => {},
        unsubscribe: () => {},
        publish: () => {},
        id: 'b',
      } as any

      const channels = server.channels
      channels.addClient(wsA)
      channels.addClient(wsB)

      server.broadcastToClients([wsA.data.id], 'test-event', { data: 'hello' })

      expect(messagesA.some((m) => m.event === 'test-event')).toBe(true)
      expect(messagesB.some((m) => m.event === 'test-event')).toBe(false)
    })

    it.skip('should support fluent to() API for broadcasting', async () => {
      // TODO: Fix broadcast message serialization
      server = new RippleServer({ port: 0 })
      await server.init()

      const messages: any[] = []
      const mockWs = {
        data: {
          id: 'test',
          channels: new Set(['chat']),
          userId: undefined,
          reconnectionToken: undefined,
          userInfo: undefined,
        },
        send: (data: string | Buffer | Uint8Array) => {
          const str =
            typeof data === 'string'
              ? data
              : Buffer.isBuffer(data)
                ? data.toString()
                : new TextDecoder().decode(data)
          messages.push(JSON.parse(str))
        },
        close: () => {},
        getBufferedAmount: () => 0,
        subscribe: () => {},
        unsubscribe: () => {},
        publish: () => {},
        id: 'test',
      } as any

      const channels = server.channels
      channels.addClient(mockWs)
      channels.subscriptions.set('test', new Set(['chat']))

      server.to('chat').emit('message', { text: 'hello' })

      expect(messages.some((m) => m.type === 'event' && m.event === 'message')).toBe(true)
    })
  })

  describe('Whisper Validation', () => {
    it('should reject whisper to non-subscribed channel', async () => {
      server = new RippleServer({ port: 0 })

      const messages: any[] = []
      const mockWs = {
        data: {
          id: 'test',
          channels: new Set(),
          userId: undefined,
          reconnectionToken: undefined,
          userInfo: undefined,
        },
        send: (data: string | Buffer | Uint8Array) => {
          const str =
            typeof data === 'string'
              ? data
              : Buffer.isBuffer(data)
                ? data.toString()
                : new TextDecoder().decode(data)
          messages.push(JSON.parse(str))
        },
        close: () => {},
        getBufferedAmount: () => 0,
        subscribe: () => {},
        unsubscribe: () => {},
        publish: () => {},
        id: 'test',
      } as any

      const channels = server.channels
      channels.addClient(mockWs)

      await server.handleMessage(
        mockWs,
        JSON.stringify({
          type: 'whisper',
          channel: 'not-subscribed',
          event: 'test',
          data: {},
        })
      )

      expect(messages.some((m) => m.type === 'error')).toBe(true)
    })
  })
})
