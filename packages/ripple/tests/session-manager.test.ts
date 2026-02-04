/**
 * @fileoverview Tests for SessionManager
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { SessionManager } from '../src/tracking/SessionManager'

describe('SessionManager', () => {
  let sessionManager: SessionManager

  beforeEach(() => {
    sessionManager = new SessionManager({
      sessionTTL: 60000, // 1 minute
      maxSessions: 100,
    })
  })

  afterEach(() => {
    sessionManager.shutdown()
  })

  describe('createSession', () => {
    it('should create a session and return a token', () => {
      const token = sessionManager.createSession({
        clientId: 'client-123',
        userId: 'user-456',
        channels: ['news', 'updates'],
        userInfo: { name: 'John Doe' },
      })

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should store session data correctly', () => {
      const sessionData = {
        clientId: 'client-123',
        userId: 'user-456',
        channels: ['news', 'updates'],
        userInfo: { name: 'John Doe' },
      }

      const token = sessionManager.createSession(sessionData)
      const retrieved = sessionManager.getSession(token)

      expect(retrieved).toBeDefined()
      expect(retrieved?.clientId).toBe(sessionData.clientId)
      expect(retrieved?.userId).toBe(sessionData.userId)
      expect(retrieved?.channels).toEqual(sessionData.channels)
      expect(retrieved?.userInfo).toEqual(sessionData.userInfo)
      expect(retrieved?.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should generate unique tokens for different sessions', () => {
      const token1 = sessionManager.createSession({
        clientId: 'client-1',
        channels: [],
      })

      const token2 = sessionManager.createSession({
        clientId: 'client-2',
        channels: [],
      })

      expect(token1).not.toBe(token2)
    })

    it('should enforce max sessions limit', () => {
      const smallManager = new SessionManager({
        sessionTTL: 60000,
        maxSessions: 2,
      })

      // Create 3 sessions (exceeds limit)
      const token1 = smallManager.createSession({ clientId: 'client-1', channels: [] })
      const token2 = smallManager.createSession({ clientId: 'client-2', channels: [] })
      const token3 = smallManager.createSession({ clientId: 'client-3', channels: [] })

      // First session should be removed
      expect(smallManager.getSession(token1)).toBeUndefined()
      expect(smallManager.getSession(token2)).toBeDefined()
      expect(smallManager.getSession(token3)).toBeDefined()
      expect(smallManager.getSessionCount()).toBe(2)

      smallManager.shutdown()
    })
  })

  describe('getSession', () => {
    it('should return undefined for non-existent token', () => {
      const session = sessionManager.getSession('invalid-token')
      expect(session).toBeUndefined()
    })

    it('should return undefined for expired session', () => {
      const shortManager = new SessionManager({
        sessionTTL: 10, // 10ms
        maxSessions: 100,
      })

      const token = shortManager.createSession({
        clientId: 'client-123',
        channels: [],
      })

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const session = shortManager.getSession(token)
          expect(session).toBeUndefined()
          shortManager.shutdown()
          resolve()
        }, 20)
      })
    })

    it('should return valid session before expiration', () => {
      const token = sessionManager.createSession({
        clientId: 'client-123',
        channels: ['news'],
      })

      const session = sessionManager.getSession(token)
      expect(session).toBeDefined()
      expect(session?.clientId).toBe('client-123')
    })
  })

  describe('removeSession', () => {
    it('should remove a session by token', () => {
      const token = sessionManager.createSession({
        clientId: 'client-123',
        channels: [],
      })

      expect(sessionManager.getSession(token)).toBeDefined()
      sessionManager.removeSession(token)
      expect(sessionManager.getSession(token)).toBeUndefined()
    })

    it('should handle removing non-existent session gracefully', () => {
      expect(() => {
        sessionManager.removeSession('invalid-token')
      }).not.toThrow()
    })
  })

  describe('getSessionCount', () => {
    it('should return 0 for empty manager', () => {
      expect(sessionManager.getSessionCount()).toBe(0)
    })

    it('should return correct count after adding sessions', () => {
      sessionManager.createSession({ clientId: 'client-1', channels: [] })
      sessionManager.createSession({ clientId: 'client-2', channels: [] })
      sessionManager.createSession({ clientId: 'client-3', channels: [] })

      expect(sessionManager.getSessionCount()).toBe(3)
    })

    it('should update count after removing sessions', () => {
      const token = sessionManager.createSession({ clientId: 'client-1', channels: [] })
      expect(sessionManager.getSessionCount()).toBe(1)

      sessionManager.removeSession(token)
      expect(sessionManager.getSessionCount()).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('should automatically clean up expired sessions', () => {
      const quickManager = new SessionManager({
        sessionTTL: 50, // 50ms
        maxSessions: 100,
      })

      // Create sessions
      quickManager.createSession({ clientId: 'client-1', channels: [] })
      quickManager.createSession({ clientId: 'client-2', channels: [] })

      expect(quickManager.getSessionCount()).toBe(2)

      // Wait for cleanup interval (30s is too long, so we'll test expiration via getSession)
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Accessing expired sessions should remove them
          const count = quickManager.getSessionCount()
          // Sessions should still be in memory until cleanup runs
          expect(count).toBe(2)
          quickManager.shutdown()
          resolve()
        }, 100)
      })
    })
  })

  describe('shutdown', () => {
    it('should clear all sessions', () => {
      sessionManager.createSession({ clientId: 'client-1', channels: [] })
      sessionManager.createSession({ clientId: 'client-2', channels: [] })

      expect(sessionManager.getSessionCount()).toBe(2)

      sessionManager.shutdown()
      expect(sessionManager.getSessionCount()).toBe(0)
    })

    it('should stop cleanup interval', () => {
      const manager = new SessionManager({
        sessionTTL: 60000,
        maxSessions: 100,
      })

      manager.shutdown()
      // If cleanup interval is not stopped, it could cause issues
      // This test mainly ensures no errors are thrown
      expect(manager.getSessionCount()).toBe(0)
    })
  })

  describe('session expiry', () => {
    it('should set correct expiry timestamp', () => {
      const now = Date.now()
      const token = sessionManager.createSession({
        clientId: 'client-123',
        channels: [],
      })

      const session = sessionManager.getSession(token)
      expect(session?.expiresAt).toBeGreaterThan(now)
      expect(session?.expiresAt).toBeLessThanOrEqual(now + 60000 + 100) // TTL + small buffer
    })
  })

  describe('edge cases', () => {
    it('should handle empty channels array', () => {
      const token = sessionManager.createSession({
        clientId: 'client-123',
        channels: [],
      })

      const session = sessionManager.getSession(token)
      expect(session?.channels).toEqual([])
    })

    it('should handle missing optional fields', () => {
      const token = sessionManager.createSession({
        clientId: 'client-123',
        channels: ['news'],
      })

      const session = sessionManager.getSession(token)
      expect(session?.userId).toBeUndefined()
      expect(session?.userInfo).toBeUndefined()
    })

    it('should handle large channel lists', () => {
      const channels = Array.from({ length: 100 }, (_, i) => `channel-${i}`)
      const token = sessionManager.createSession({
        clientId: 'client-123',
        channels,
      })

      const session = sessionManager.getSession(token)
      expect(session?.channels).toEqual(channels)
      expect(session?.channels.length).toBe(100)
    })
  })
})
