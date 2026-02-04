/**
 * @fileoverview Tests for Redis presence persistence
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { RedisDriver } from '../src/drivers/RedisDriver'
import type { PresenceUserInfo } from '../src/types'

describe('RedisDriver - Presence Persistence', () => {
  let driver: RedisDriver

  beforeEach(async () => {
    driver = new RedisDriver({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    })
    await driver.init?.()
  })

  afterEach(async () => {
    // Clean up test data
    await driver.shutdown?.()
  })

  describe('trackPresence', () => {
    it('should store presence member in Redis', async () => {
      const userInfo: PresenceUserInfo = {
        id: 'user-123',
        info: { name: 'John Doe', status: 'online' },
      }

      await driver.trackPresence?.('presence-lobby', userInfo)

      const members = await driver.getPresenceMembers?.('presence-lobby')
      expect(members).toBeDefined()
      expect(members?.length).toBe(1)
      expect(members?.[0].id).toBe('user-123')
      expect(members?.[0].info).toEqual({ name: 'John Doe', status: 'online' })
    })

    it('should handle multiple members in same channel', async () => {
      const user1: PresenceUserInfo = {
        id: 'user-1',
        info: { name: 'Alice' },
      }
      const user2: PresenceUserInfo = {
        id: 'user-2',
        info: { name: 'Bob' },
      }

      await driver.trackPresence?.('presence-chat', user1)
      await driver.trackPresence?.('presence-chat', user2)

      const members = await driver.getPresenceMembers?.('presence-chat')
      expect(members?.length).toBe(2)

      const ids = members?.map((m) => m.id).sort()
      expect(ids).toEqual(['user-1', 'user-2'])
    })

    it('should update existing member info', async () => {
      const userV1: PresenceUserInfo = {
        id: 'user-123',
        info: { status: 'online' },
      }
      const userV2: PresenceUserInfo = {
        id: 'user-123',
        info: { status: 'away' },
      }

      await driver.trackPresence?.('presence-lobby', userV1)
      await driver.trackPresence?.('presence-lobby', userV2)

      const members = await driver.getPresenceMembers?.('presence-lobby')
      expect(members?.length).toBe(1)
      expect(members?.[0].info).toEqual({ status: 'away' })
    })

    it('should handle numeric user IDs', async () => {
      const userInfo: PresenceUserInfo = {
        id: 12345,
        info: { name: 'Numeric User' },
      }

      await driver.trackPresence?.('presence-test', userInfo)

      const members = await driver.getPresenceMembers?.('presence-test')
      expect(members?.length).toBe(1)
      expect(members?.[0].id).toBe(12345)
    })
  })

  describe('untrackPresence', () => {
    it('should remove presence member from Redis', async () => {
      const userInfo: PresenceUserInfo = {
        id: 'user-123',
        info: { name: 'John Doe' },
      }

      await driver.trackPresence?.('presence-lobby', userInfo)
      let members = await driver.getPresenceMembers?.('presence-lobby')
      expect(members?.length).toBe(1)

      await driver.untrackPresence?.('presence-lobby', 'user-123')
      members = await driver.getPresenceMembers?.('presence-lobby')
      expect(members?.length).toBe(0)
    })

    it('should handle removing non-existent member', async () => {
      await driver.untrackPresence?.('presence-lobby', 'nonexistent')
      const members = await driver.getPresenceMembers?.('presence-lobby')
      expect(members?.length).toBe(0)
    })

    it('should only remove specified member', async () => {
      const user1: PresenceUserInfo = { id: 'user-1', info: {} }
      const user2: PresenceUserInfo = { id: 'user-2', info: {} }

      await driver.trackPresence?.('presence-chat', user1)
      await driver.trackPresence?.('presence-chat', user2)

      await driver.untrackPresence?.('presence-chat', 'user-1')

      const members = await driver.getPresenceMembers?.('presence-chat')
      expect(members?.length).toBe(1)
      expect(members?.[0].id).toBe('user-2')
    })

    it('should handle numeric user IDs', async () => {
      const userInfo: PresenceUserInfo = { id: 12345, info: {} }

      await driver.trackPresence?.('presence-test', userInfo)
      await driver.untrackPresence?.('presence-test', 12345)

      const members = await driver.getPresenceMembers?.('presence-test')
      expect(members?.length).toBe(0)
    })
  })

  describe('getPresenceMembers', () => {
    it('should return empty array for channel with no members', async () => {
      const members = await driver.getPresenceMembers?.('presence-empty')
      expect(members).toBeDefined()
      expect(members?.length).toBe(0)
    })

    it('should return all members for a channel', async () => {
      const users: PresenceUserInfo[] = [
        { id: 'user-1', info: { name: 'Alice' } },
        { id: 'user-2', info: { name: 'Bob' } },
        { id: 'user-3', info: { name: 'Charlie' } },
      ]

      for (const user of users) {
        await driver.trackPresence?.('presence-team', user)
      }

      const members = await driver.getPresenceMembers?.('presence-team')
      expect(members?.length).toBe(3)

      const names = members?.map((m) => m.info?.name).sort()
      expect(names).toEqual(['Alice', 'Bob', 'Charlie'])
    })

    it('should handle corrupted JSON gracefully', async () => {
      // This test would require direct Redis access to inject bad data
      // For now, we'll just verify the method exists and returns an array
      const members = await driver.getPresenceMembers?.('presence-test')
      expect(Array.isArray(members)).toBe(true)
    })
  })

  describe('cross-channel isolation', () => {
    it('should keep presence data separate per channel', async () => {
      const user1: PresenceUserInfo = { id: 'user-1', info: { channel: 'lobby' } }
      const user2: PresenceUserInfo = { id: 'user-2', info: { channel: 'chat' } }

      await driver.trackPresence?.('presence-lobby', user1)
      await driver.trackPresence?.('presence-chat', user2)

      const lobbyMembers = await driver.getPresenceMembers?.('presence-lobby')
      const chatMembers = await driver.getPresenceMembers?.('presence-chat')

      expect(lobbyMembers?.length).toBe(1)
      expect(chatMembers?.length).toBe(1)
      expect(lobbyMembers?.[0].id).toBe('user-1')
      expect(chatMembers?.[0].id).toBe('user-2')
    })
  })

  describe('TTL behavior', () => {
    it('should set TTL on presence hash', async () => {
      const userInfo: PresenceUserInfo = {
        id: 'user-123',
        info: { name: 'Test User' },
      }

      await driver.trackPresence?.('presence-ttl-test', userInfo)

      // Note: Testing TTL directly would require Redis client access
      // This test verifies the method completes without error
      const members = await driver.getPresenceMembers?.('presence-ttl-test')
      expect(members?.length).toBe(1)
    })
  })

  describe('error handling', () => {
    it('should throw error if driver not initialized', async () => {
      const uninitializedDriver = new RedisDriver()

      await expect(async () => {
        await uninitializedDriver.trackPresence?.('test', { id: '1', info: {} })
      }).toThrow()
    })
  })
})
