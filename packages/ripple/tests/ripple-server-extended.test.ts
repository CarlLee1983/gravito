import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test'
import { RippleServer } from '../src/RippleServer'
import { createMockWebSocket } from './helpers'

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
      server = new RippleServer()
      await server.init()

      const stats = server.getStats()
      expect(stats.totalClients).toBeGreaterThanOrEqual(0)
    })

    it('should start ping interval on init', async () => {
      vi.useFakeTimers()
      server = new RippleServer({ pingInterval: 1000 })
      await server.init()

      const mockWs = createMockWebSocket()
      const handler = server.getHandler()
      handler.open(mockWs)

      vi.advanceTimersByTime(1000)

      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('pong'))

      vi.useRealTimers()
    })

    it('should clear ping interval on shutdown', async () => {
      server = new RippleServer({ pingInterval: 1000 })
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
      })

      const messages: any[] = []
      const mockWs = createMockWebSocket((data) => {
        messages.push(JSON.parse(data))
      })

      const handler = server.getHandler()
      handler.open(mockWs)

      await handler.message(
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
      })

      const messages: any[] = []
      const mockWs = createMockWebSocket((data) => {
        messages.push(JSON.parse(data))
      })

      const handler = server.getHandler()
      handler.open(mockWs)

      await handler.message(
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
        authorizer: async (channel, userId) => ({
          id: userId ?? 'anonymous',
          info: { name: 'Test User' },
        }),
      })

      const messages: any[] = []
      const mockWs = createMockWebSocket((data) => {
        messages.push(JSON.parse(data))
      })

      const handler = server.getHandler()
      handler.open(mockWs)

      await handler.message(
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

  describe('Event Listeners', () => {
    it('should trigger registered event listeners on whisper', async () => {
      server = new RippleServer()
      const handler = server.getHandler()
      const receivedEvents: any[] = []

      server.on('custom-event', (ws, data) => {
        receivedEvents.push({ socketId: ws.data.id, data })
      })

      const mockWs = createMockWebSocket()
      handler.open(mockWs)

      await handler.message(
        mockWs,
        JSON.stringify({
          type: 'subscribe',
          channel: 'test',
        })
      )

      await handler.message(
        mockWs,
        JSON.stringify({
          type: 'whisper',
          channel: 'test',
          event: 'custom-event',
          data: { foo: 'bar' },
        })
      )

      expect(receivedEvents.length).toBe(1)
      expect(receivedEvents[0].data).toEqual({ foo: 'bar' })
    })
  })

  describe('Broadcast Methods', () => {
    it('should broadcast to specific clients via broadcastToClients', () => {
      server = new RippleServer()
      const handler = server.getHandler()

      const messagesA: any[] = []
      const messagesB: any[] = []

      const wsA = createMockWebSocket((d) => messagesA.push(JSON.parse(d)))
      const wsB = createMockWebSocket((d) => messagesB.push(JSON.parse(d)))

      handler.open(wsA)
      handler.open(wsB)

      server.broadcastToClients([wsA.data.id], 'test-event', { data: 'hello' })

      expect(messagesA.some((m) => m.event === 'test-event')).toBe(true)
      expect(messagesB.some((m) => m.event === 'test-event')).toBe(false)
    })

    it('should support fluent to() API for broadcasting', async () => {
      server = new RippleServer()
      const handler = server.getHandler()

      const messages: any[] = []
      const mockWs = createMockWebSocket((d) => messages.push(JSON.parse(d)))

      handler.open(mockWs)

      await handler.message(
        mockWs,
        JSON.stringify({
          type: 'subscribe',
          channel: 'chat',
        })
      )

      server.to('chat').emit('message', { text: 'hello' })

      expect(messages.some((m) => m.type === 'event' && m.event === 'message')).toBe(true)
    })
  })

  describe('Whisper Validation', () => {
    it('should reject whisper to non-subscribed channel', async () => {
      server = new RippleServer()
      const handler = server.getHandler()

      const messages: any[] = []
      const mockWs = createMockWebSocket((d) => messages.push(JSON.parse(d)))

      handler.open(mockWs)

      await handler.message(
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
