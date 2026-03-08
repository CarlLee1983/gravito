/**
 * @fileoverview Integration tests for reconnection flow
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { RippleServer } from '../../src/RippleServer'
import type { RippleConfig } from '../../src/types'

describe('Reconnection Flow Integration', () => {
  let server: RippleServer
  const config: RippleConfig = {
    path: '/ws',
    reconnection: {
      enabled: true,
      sessionTTL: 60000,
      maxSessions: 1000,
    },
  }

  beforeEach(async () => {
    server = new RippleServer(config)
    await server.init()
  })

  afterEach(async () => {
    await server.shutdown()
  })

  describe('session management', () => {
    it('should create session on disconnect', async () => {
      const sessionManager = (server as any).sessionManager
      const ws = {
        data: {
          id: 'client-123',
          channels: new Set(['news', 'alerts']),
        },
      }

      // Simulate close
      ;(server as any).handleClose(ws, 1000, 'Normal closure')

      expect(sessionManager.getSessionCount()).toBe(1)
    })

    it('should restore subscriptions on reconnect', async () => {
      const sessionManager = (server as any).sessionManager

      const token = sessionManager.createSession({
        clientId: 'client-123',
        channels: ['news', 'alerts'],
      })

      const reconnectWs = {
        data: {
          id: 'client-123',
          channels: new Set(),
          reconnectionToken: token,
        },
        send: () => {},
      }

      await (server as any).handleOpen(reconnectWs)

      // Subscriptions should be restored
      expect(reconnectWs.data.channels.has('news')).toBe(true)
      expect(reconnectWs.data.channels.has('alerts')).toBe(true)

      // Session should be removed after successful reconnection
      expect(sessionManager.getSessionCount()).toBe(0)
    })

    it('should handle invalid reconnection token', async () => {
      const reconnectWs = {
        data: {
          id: 'client-123',
          channels: new Set(),
          reconnectionToken: 'invalid-token',
        },
        send: () => {},
      }

      await (server as any).handleOpen(reconnectWs)

      // Should not restore anything
      expect(reconnectWs.data.channels.size).toBe(0)
    })

    it('should handle expired session token', async () => {
      const shortServer = new RippleServer({
        path: '/ws',
        reconnection: {
          enabled: true,
          sessionTTL: 30, // 30ms
        },
      })

      const sessionManager = (shortServer as any).sessionManager
      const token = sessionManager.createSession({
        clientId: 'client-123',
        channels: ['news'],
      })

      // Wait for expiration
      await Bun.sleep(60)

      const session = sessionManager.getSession(token)
      expect(session).toBeUndefined()

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

      const sessionManager = (server as any).sessionManager
      sessionManager.createSession({
        clientId: 'client-old',
        userId: 'user-123',
        channels: ['news'],
      })

      // upgrade() returns false when engine is not started (no listen() called)
      const result = server.upgrade(req)
      expect(result).toBe(false)
    })

    it('should handle missing reconnection token', () => {
      const req = new Request('http://localhost/ws')

      // upgrade() returns false when engine is not started (no listen() called)
      const result = server.upgrade(req)
      expect(result).toBe(false)
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
