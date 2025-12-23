/**
 * @fileoverview Tests for @gravito/ripple
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import {
  CHANNEL_PREFIXES,
  ChannelManager,
  createChannel,
  PresenceChannel,
  PrivateChannel,
  PublicChannel,
  requiresAuth,
} from '../src/channels'
import { LocalDriver } from '../src/drivers'
import { BroadcastEvent } from '../src/events/BroadcastEvent'
import { RippleServer } from '../src/RippleServer'

// ─────────────────────────────────────────────────────────────
// Channel Tests
// ─────────────────────────────────────────────────────────────

describe('Channels', () => {
  describe('PublicChannel', () => {
    it('should have correct type and fullName', () => {
      const channel = new PublicChannel('news')
      expect(channel.type).toBe('public')
      expect(channel.name).toBe('news')
      expect(channel.fullName).toBe('news')
    })
  })

  describe('PrivateChannel', () => {
    it('should have correct type and fullName with prefix', () => {
      const channel = new PrivateChannel('orders.123')
      expect(channel.type).toBe('private')
      expect(channel.name).toBe('orders.123')
      expect(channel.fullName).toBe('private-orders.123')
    })
  })

  describe('PresenceChannel', () => {
    it('should have correct type and fullName with prefix', () => {
      const channel = new PresenceChannel('chat.lobby')
      expect(channel.type).toBe('presence')
      expect(channel.name).toBe('chat.lobby')
      expect(channel.fullName).toBe('presence-chat.lobby')
    })
  })

  describe('createChannel', () => {
    it('should create PublicChannel for unprefixed name', () => {
      const channel = createChannel('news')
      expect(channel.type).toBe('public')
      expect(channel.name).toBe('news')
    })

    it('should create PrivateChannel for private-prefixed name', () => {
      const channel = createChannel('private-orders.123')
      expect(channel.type).toBe('private')
      expect(channel.name).toBe('orders.123')
    })

    it('should create PresenceChannel for presence-prefixed name', () => {
      const channel = createChannel('presence-chat.lobby')
      expect(channel.type).toBe('presence')
      expect(channel.name).toBe('chat.lobby')
    })
  })

  describe('requiresAuth', () => {
    it('should return false for public channels', () => {
      expect(requiresAuth('news')).toBe(false)
      expect(requiresAuth('updates')).toBe(false)
    })

    it('should return true for private channels', () => {
      expect(requiresAuth('private-orders.123')).toBe(true)
    })

    it('should return true for presence channels', () => {
      expect(requiresAuth('presence-chat.lobby')).toBe(true)
    })
  })
})

// ─────────────────────────────────────────────────────────────
// ChannelManager Tests
// ─────────────────────────────────────────────────────────────

describe('ChannelManager', () => {
  let manager: ChannelManager

  beforeEach(() => {
    manager = new ChannelManager()
  })

  it('should track statistics', () => {
    const stats = manager.getStats()
    expect(stats.totalClients).toBe(0)
    expect(stats.totalChannels).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────
// LocalDriver Tests
// ─────────────────────────────────────────────────────────────

describe('LocalDriver', () => {
  it('should have correct name', () => {
    const driver = new LocalDriver()
    expect(driver.name).toBe('local')
  })

  it('should publish and receive messages', async () => {
    const driver = new LocalDriver()
    let received = false
    let receivedEvent = ''
    let receivedData: unknown = null

    await driver.subscribe('test-channel', (event, data) => {
      received = true
      receivedEvent = event
      receivedData = data
    })

    await driver.publish('test-channel', 'TestEvent', { foo: 'bar' })

    expect(received).toBe(true)
    expect(receivedEvent).toBe('TestEvent')
    expect(receivedData).toEqual({ foo: 'bar' })
  })

  it('should unsubscribe from channels', async () => {
    const driver = new LocalDriver()
    let received = false

    await driver.subscribe('test-channel', () => {
      received = true
    })

    await driver.unsubscribe('test-channel')
    await driver.publish('test-channel', 'TestEvent', {})

    expect(received).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────
// RippleServer Tests
// ─────────────────────────────────────────────────────────────

describe('RippleServer', () => {
  it('should create with default config', () => {
    const server = new RippleServer()
    expect(server.config.path).toBe('/ws')
    expect(server.config.authEndpoint).toBe('/broadcasting/auth')
    expect(server.config.pingInterval).toBe(30000)
  })

  it('should create with custom config', () => {
    const server = new RippleServer({
      path: '/websocket',
      authEndpoint: '/api/auth',
      pingInterval: 60000,
    })
    expect(server.config.path).toBe('/websocket')
    expect(server.config.authEndpoint).toBe('/api/auth')
    expect(server.config.pingInterval).toBe(60000)
  })

  it('should return WebSocket handler', () => {
    const server = new RippleServer()
    const handler = server.getHandler()

    expect(handler.open).toBeDefined()
    expect(handler.message).toBeDefined()
    expect(handler.close).toBeDefined()
  })

  it('should return stats', () => {
    const server = new RippleServer()
    const stats = server.getStats()

    expect(stats.totalClients).toBe(0)
    expect(stats.totalChannels).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────
// BroadcastEvent Tests
// ─────────────────────────────────────────────────────────────

describe('BroadcastEvent', () => {
  class TestEvent extends BroadcastEvent {
    constructor(public message: string) {
      super()
    }

    broadcastOn() {
      return new PublicChannel('test')
    }
  }

  it('should use class name as default event name', () => {
    const event = new TestEvent('hello')
    expect(event.broadcastAs()).toBe('TestEvent')
  })

  it('should return empty except array by default', () => {
    const event = new TestEvent('hello')
    expect(event.broadcastExcept()).toEqual([])
  })

  it('should serialize public properties', () => {
    const event = new TestEvent('hello')
    const data = event.broadcastWith()
    expect(data.message).toBe('hello')
  })
})
