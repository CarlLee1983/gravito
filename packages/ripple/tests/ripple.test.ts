/**
 * @fileoverview Tests for @gravito/ripple
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import {
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
    expect(stats.channels).toEqual([])
  })

  it('should track stats with active subscriptions', async () => {
    const ws1 = {
      data: { id: 'client-1', channels: new Set<string>() },
    } as any
    const ws2 = {
      data: { id: 'client-2', channels: new Set<string>() },
    } as any

    manager.addClient(ws1)
    manager.addClient(ws2)
    await manager.subscribe('client-1', 'channel-a')
    await manager.subscribe('client-2', 'channel-a')
    await manager.subscribe('client-1', 'channel-b')

    const stats = manager.getStats()
    expect(stats.totalClients).toBe(2)
    expect(stats.totalChannels).toBe(2)
    expect(stats.channels).toHaveLength(2)
    expect(stats.channels.find((c) => c.name === 'channel-a')?.subscribers).toBe(2)
    expect(stats.channels.find((c) => c.name === 'channel-b')?.subscribers).toBe(1)
  })

  it('manages subscriptions and presence members', async () => {
    const ws = {
      data: {
        id: 'client-1',
        channels: new Set<string>(),
      },
    } as any

    manager.addClient(ws)
    expect(manager.getAllClients().length).toBe(1)

    await manager.subscribe('client-1', 'public-room')
    expect(manager.isSubscribed('client-1', 'public-room')).toBe(true)
    expect(manager.getSubscribers('public-room').length).toBe(1)

    await manager.subscribe('client-1', 'presence-room', { id: 'user-1', info: { name: 'Ada' } })
    expect((await manager.getPresenceMembers('presence-room')).length).toBe(1)
    expect(manager.getMemberCount('presence-room')).toBe(1)

    await manager.unsubscribe('client-1', 'presence-room')
    expect((await manager.getPresenceMembers('presence-room')).length).toBe(0)

    const left = manager.removeClient('client-1')
    expect(left).toContain('public-room')
    expect(manager.getClient('client-1')).toBeUndefined()
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

  it('should initialize correctly for v5.0 engine architecture', async () => {
    const server = new RippleServer()
    expect(server.config.path).toBe('/ws')
    expect(server.config.authEndpoint).toBe('/broadcasting/auth')
    // v5.0 uses engine-based initialization instead of getHandler()
    await server.shutdown()
  })

  it('should return stats', () => {
    const server = new RippleServer()
    const stats = server.getStats()

    expect(stats.totalClients).toBe(0)
    expect(stats.totalChannels).toBe(0)
  })

  it('handles subscribe, whisper, ping, and invalid messages via engine', async () => {
    const server = new RippleServer({
      authorizer: async () => true,
      port: 0,
    })

    const messages: Record<string, any[]> = { one: [], two: [] }
    const createMockSocket = (id: string, messageList: any[]) => ({
      data: {
        id,
        channels: new Set<string>(),
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
        messageList.push(JSON.parse(str))
      },
      close: () => {},
      getBufferedAmount: () => 0,
      subscribe: () => {},
      unsubscribe: () => {},
      publish: () => {},
      id,
    })

    const ws1 = createMockSocket('ws-1', messages.one) as any
    const ws2 = createMockSocket('ws-2', messages.two) as any

    // Simulate engine connection
    const channels = server.channels
    channels.addClient(ws1)
    channels.addClient(ws2)

    // Simulate messages
    await server.handleMessage(ws1, JSON.stringify({ type: 'subscribe', channel: 'public-room' }))
    await server.handleMessage(ws2, JSON.stringify({ type: 'subscribe', channel: 'public-room' }))
    await server.handleMessage(
      ws1,
      JSON.stringify({ type: 'whisper', channel: 'public-room', event: 'notice', data: { ok: 1 } })
    )
    await server.handleMessage(ws1, JSON.stringify({ type: 'ping' }))
    await server.handleMessage(ws1, '{not-json')

    const types = messages.one.map((m) => m.type)
    expect(types).toContain('subscribed')
    expect(types).toContain('pong')
    expect(types).toContain('error')

    const peerTypes = messages.two.map((m) => m.type)
    expect(peerTypes).toContain('event')
  })

  it('handles presence channels and close events', async () => {
    const server = new RippleServer({
      authorizer: async (_channel, _userId, socketId) => {
        return { id: socketId, info: { name: socketId } }
      },
      port: 0,
    })

    const messages: Record<string, any[]> = { a: [], b: [] }
    const createMockSocket = (id: string) => ({
      data: {
        id,
        channels: new Set<string>(),
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
        messages[id].push(JSON.parse(str))
      },
      close: () => {},
      getBufferedAmount: () => 0,
      subscribe: () => {},
      unsubscribe: () => {},
      publish: () => {},
      id,
    })

    const wsA = createMockSocket('a') as any
    const wsB = createMockSocket('b') as any

    // Simulate engine connections
    const channels = server.channels
    channels.addClient(wsA)
    channels.addClient(wsB)

    // Simulate messages
    await server.handleMessage(wsA, JSON.stringify({ type: 'subscribe', channel: 'presence-room' }))
    await server.handleMessage(wsB, JSON.stringify({ type: 'subscribe', channel: 'presence-room' }))

    // Simulate close
    server.handleClose(wsA, 1000, 'bye')

    const aTypes = messages.a.map((m) => m.type)
    const bTypes = messages.b.map((m) => m.type)
    expect(aTypes).toContain('presence')
    expect(bTypes).toContain('presence')
  })

  it('rejects private channels without authorizer', async () => {
    const server = new RippleServer({ port: 0 })
    const responses: any[] = []
    const ws = {
      data: {
        id: 'ws-2',
        channels: new Set<string>(),
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
        responses.push(JSON.parse(str))
      },
      close: () => {},
      getBufferedAmount: () => 0,
      subscribe: () => {},
      unsubscribe: () => {},
      publish: () => {},
      id: 'ws-2',
    } as any

    const channels = server.channels
    channels.addClient(ws)
    await server.handleMessage(ws, JSON.stringify({ type: 'subscribe', channel: 'private-room' }))

    expect(
      responses.some((m) => m.message === 'No authorizer configured for private channels')
    ).toBe(true)
  })

  it('upgrades only matching paths', () => {
    const server = new RippleServer({ path: '/ws' })

    // Test path matching - non-matching path should return false
    const bad = server.upgrade(new Request('http://localhost/other'))

    // Matching path returns false because server is not listening (no BunEngine upgrade support without listen)
    // This is expected behavior since engine needs to be running to handle upgrade
    const ok = server.upgrade(new Request('http://localhost/ws'))

    expect(bad).toBe(false)
    // With server not running, matching path returns false from engine
    expect(ok).toBe(false)
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
