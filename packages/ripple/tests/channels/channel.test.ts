import { describe, expect, it } from 'bun:test'
import {
  CHANNEL_PREFIXES,
  createChannel,
  PresenceChannel,
  PrivateChannel,
  PublicChannel,
  requiresAuth,
} from '../../src/channels/Channel'

describe('Channel', () => {
  describe('PublicChannel', () => {
    it('should create public channel with correct type', () => {
      const channel = new PublicChannel('news')

      expect(channel.type).toBe('public')
      expect(channel.name).toBe('news')
      expect(channel.fullName).toBe('news')
    })

    it('should handle channel names with special characters', () => {
      const channel = new PublicChannel('orders.123')

      expect(channel.fullName).toBe('orders.123')
    })
  })

  describe('PrivateChannel', () => {
    it('should create private channel with correct prefix', () => {
      const channel = new PrivateChannel('orders.123')

      expect(channel.type).toBe('private')
      expect(channel.name).toBe('orders.123')
      expect(channel.fullName).toBe('private-orders.123')
    })

    it('should use CHANNEL_PREFIXES constant', () => {
      const channel = new PrivateChannel('test')

      expect(channel.fullName).toBe(`${CHANNEL_PREFIXES.private}test`)
    })
  })

  describe('PresenceChannel', () => {
    it('should create presence channel with correct prefix', () => {
      const channel = new PresenceChannel('chat.lobby')

      expect(channel.type).toBe('presence')
      expect(channel.name).toBe('chat.lobby')
      expect(channel.fullName).toBe('presence-chat.lobby')
    })

    it('should use CHANNEL_PREFIXES constant', () => {
      const channel = new PresenceChannel('test')

      expect(channel.fullName).toBe(`${CHANNEL_PREFIXES.presence}test`)
    })
  })

  describe('CHANNEL_PREFIXES', () => {
    it('should have correct prefix values', () => {
      expect(CHANNEL_PREFIXES.private).toBe('private-')
      expect(CHANNEL_PREFIXES.presence).toBe('presence-')
    })
  })

  describe('createChannel', () => {
    it('should create PublicChannel from public channel name', () => {
      const channel = createChannel('news')

      expect(channel).toBeInstanceOf(PublicChannel)
      expect(channel.type).toBe('public')
      expect(channel.name).toBe('news')
      expect(channel.fullName).toBe('news')
    })

    it('should create PrivateChannel from private- prefix', () => {
      const channel = createChannel('private-orders.123')

      expect(channel).toBeInstanceOf(PrivateChannel)
      expect(channel.type).toBe('private')
      expect(channel.name).toBe('orders.123')
      expect(channel.fullName).toBe('private-orders.123')
    })

    it('should create PresenceChannel from presence- prefix', () => {
      const channel = createChannel('presence-chat.lobby')

      expect(channel).toBeInstanceOf(PresenceChannel)
      expect(channel.type).toBe('presence')
      expect(channel.name).toBe('chat.lobby')
      expect(channel.fullName).toBe('presence-chat.lobby')
    })
  })

  describe('requiresAuth', () => {
    it('should return false for public channels', () => {
      expect(requiresAuth('news')).toBe(false)
      expect(requiresAuth('chat')).toBe(false)
      expect(requiresAuth('updates.123')).toBe(false)
    })

    it('should return true for private channels', () => {
      expect(requiresAuth('private-orders.123')).toBe(true)
      expect(requiresAuth('private-user.456')).toBe(true)
    })

    it('should return true for presence channels', () => {
      expect(requiresAuth('presence-lobby')).toBe(true)
      expect(requiresAuth('presence-chat.room1')).toBe(true)
    })
  })
})
