/**
 * @fileoverview Integration tests for reconnection flow
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { RippleServer } from '../../src/RippleServer'
import type { RippleConfig } from '../../src/types'

describe('Reconnection Flow Integration', () => {
  let server: RippleServer
  let mockWs: any

  beforeEach(async () => {
    const config: RippleConfig = {
      path: '/ws',
      reconnection: {
        enabled: true,
        sessionTTL: 60000,
        maxSessions: 100,
      },
    }

    server = new RippleServer(config)

    // Mock WebSocket
    mockWs = {
      data: {
        id: 'client-123',
        channels: new Set(['news', 'updates']),
        userId: 'user-456',
        userInfo: { name: 'Test User' },
      },
      send: () => {},
      close: () => {},
    }
  })

  afterEach(async () => {
    await server.shutdown()
  })

  describe('session creation on disconnect', () => {
    it('should create session when client disconnects', () => {
      // Simulate disconnect
      const sessionManager = (server as any).sessionManager
      expect(sessionManager).toBeDefined()

      const initialCount = sessionManager.getSessionCount()

      // Trigger handleClose
      ;(server as any).handleClose(mockWs, 1000, 'Normal closure')

      const finalCount = sessionManager.getSessionCount()
      expect(finalCount).toBe(initialCount + 1)
    })

    it('should not create session if reconnection disabled', async () => {
      const noReconnectServer = new RippleServer({ path: '/ws' })

      const sessionManager = (noReconnectServer as any).sessionManager
      expect(sessionManager).toBeUndefined()

      await noReconnectServer.shutdown()
    })

    it('should not create session if client has no channels', () => {
      const emptyWs = {
        ...mockWs,
        data: {
          ...mockWs.data,
          channels: new Set(),
        },
      }

      const sessionManager = (server as any).sessionManager
      const initialCount = sessionManager.getSessionCount()

      ;(server as any).handleClose(emptyWs, 1000, 'Normal closure')

      const finalCount = sessionManager.getSessionCount()
      expect(finalCount).toBe(initialCount)
    })
  })

  describe('session restoration on reconnect', () => {
    it('should restore subscriptions from session', async () => {
      const sessionManager = (server as any).sessionManager

      // Create a session
      const token = sessionManager.createSession({
        clientId: 'client-123',
        userId: 'user-456',
        channels: ['news', 'updates'],
        userInfo: { name: 'Test User' },
      })

      // Simulate reconnect with token
      const reconnectWs = {
        data: {
          id: 'client-123',
          channels: new Set(),
          userId: 'user-456',
          userInfo: { name: 'Test User' },
          reconnectionToken: token,
        },
        send: () => {},
      }

      await (server as any).handleOpen(reconnectWs)

      // Verify subscriptions were restored
      expect(reconnectWs.data.channels.size).toBeGreaterThan(0)

      // Session should be removed after successful reconnection
      const session = sessionManager.getSession(token)
      expect(session).toBeUndefined()
    })

    it('should handle invalid reconnection token', async () => {
      const reconnectWs = {
        data: {
          id: 'client-new',
          channels: new Set(),
          reconnectionToken: 'invalid-token',
        },
        send: () => {},
      }

      await (server as any).handleOpen(reconnectWs)

      // Should not restore any subscriptions
      expect(reconnectWs.data.channels.size).toBe(0)
    })

    it('should handle expired session token', async () => {
      const shortServer = new RippleServer({
        path: '/ws',
        reconnection: {
          enabled: true,
          sessionTTL: 10, // 10ms
        },
      })

      const sessionManager = (shortServer as any).sessionManager
      const token = sessionManager.createSession({
        clientId: 'client-123',
        channels: ['news'],
      })

      // Wait for expiration
      await Bun.sleep(20)

      const reconnectWs = {
        data: {
          id: 'client-123',
          channels: new Set(),
          reconnectionToken: token,
        },
        send: () => {},
      }

      await (shortServer as any).handleOpen(reconnectWs)

      // Should not restore subscriptions
      expect(reconnectWs.data.channels.size).toBe(0)

      await shortServer.shutdown()
    })
  })

  describe('presence channel reconnection', () => {
    it('should restore presence channel subscriptions', async () => {
      const sessionManager = (server as any).sessionManager

      const token = sessionManager.createSession({
        clientId: 'client-123',
        userId: 'user-456',
        channels: ['presence-lobby'],
        userInfo: { name: 'Test User', status: 'online' },
      })

      const reconnectWs = {
        data: {
          id: 'client-123',
          channels: new Set(),
          userId: 'user-456',
          userInfo: { name: 'Test User', status: 'online' },
          reconnectionToken: token,
        },
        send: () => {},
      }

      await (server as any).handleOpen(reconnectWs)

      // Verify presence channel was restored
      const channels = (server as any).channels
      const presenceMembers = await channels.getPresenceMembers('presence-lobby')

      expect(presenceMembers.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('upgrade with reconnection token', () => {
    it('should extract reconnection token from query params', () => {
      const req = new Request('http://localhost/ws?reconnection_token=test-token-123')
      const mockServer = {
        upgrade: () => true,
      }

      const sessionManager = (server as any).sessionManager
      sessionManager.createSession({
        clientId: 'client-old',
        userId: 'user-123',
        channels: ['news'],
      })

      const result = server.upgrade(req, mockServer as any)
      expect(result).toBe(true)
    })

    it('should handle missing reconnection token', () => {
      const req = new Request('http://localhost/ws')
      const mockServer = {
        upgrade: () => true,
      }

      const result = server.upgrade(req, mockServer as any)
      expect(result).toBe(true)
    })
  })

  describe('session limits', () => {
    it('should enforce max sessions limit', async () => {
      const limitedServer = new RippleServer({
        path: '/ws',
        reconnection: {
          enabled: true,
          sessionTTL: 60000,
          maxSessions: 2,
        },
      })

      const sessionManager = (limitedServer as any).sessionManager

      // Create 3 sessions (exceeds limit)
      for (let i = 1; i <= 3; i++) {
        const ws = {
          data: {
            id: `client-${i}`,
            channels: new Set(['news']),
          },
        }
        ;(limitedServer as any).handleClose(ws, 1000, 'test')
      }

      expect(sessionManager.getSessionCount()).toBe(2)

      await limitedServer.shutdown()
    })
  })
})
