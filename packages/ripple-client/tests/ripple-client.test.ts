/**
 * @fileoverview Tests for @gravito/ripple-client
 */

import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
import { Channel, PresenceChannel, PrivateChannel } from '../src/Channel'
import { createRippleClient, RippleClient } from '../src/RippleClient'

// ─────────────────────────────────────────────────────────────
// Channel Tests
// ─────────────────────────────────────────────────────────────

describe('Channel', () => {
  it('should store correct name', () => {
    const sendMessage = () => {}
    const channel = new Channel('test-channel', sendMessage)
    expect(channel.name).toBe('test-channel')
  })

  it('should register event listeners', () => {
    const sendMessage = () => {}
    const channel = new Channel('test', sendMessage)

    let called = false
    channel.listen('event', () => {
      called = true
    })

    channel._dispatch('event', {})
    expect(called).toBe(true)
  })

  it('should support multiple listeners for same event', () => {
    const sendMessage = () => {}
    const channel = new Channel('test', sendMessage)

    let count = 0
    channel.listen('event', () => count++)
    channel.listen('event', () => count++)

    channel._dispatch('event', {})
    expect(count).toBe(2)
  })

  it('should stop listening to specific event', () => {
    const sendMessage = () => {}
    const channel = new Channel('test', sendMessage)

    let called = false
    channel.listen('event', () => {
      called = true
    })
    channel.stopListening('event')

    channel._dispatch('event', {})
    expect(called).toBe(false)
  })

  it('should stop all listeners', () => {
    const sendMessage = () => {}
    const channel = new Channel('test', sendMessage)

    let count = 0
    channel.listen('event1', () => count++)
    channel.listen('event2', () => count++)
    channel.stopListening()

    channel._dispatch('event1', {})
    channel._dispatch('event2', {})
    expect(count).toBe(0)
  })

  it('should send whisper message', () => {
    let sentMessage: object | null = null
    const sendMessage = (msg: object) => {
      sentMessage = msg
    }
    const channel = new Channel('test', sendMessage)

    channel.whisper('typing', { user: 'john' })

    expect(sentMessage).toEqual({
      type: 'whisper',
      channel: 'test',
      event: 'typing',
      data: { user: 'john' },
    })
  })
})

describe('PrivateChannel', () => {
  it('should add private- prefix to name', () => {
    const sendMessage = () => {}
    const channel = new PrivateChannel('orders.123', sendMessage)
    expect(channel.name).toBe('private-orders.123')
  })
})

describe('PresenceChannel', () => {
  it('should add presence- prefix to name', () => {
    const sendMessage = () => {}
    const channel = new PresenceChannel('chat.lobby', sendMessage)
    expect(channel.name).toBe('presence-chat.lobby')
  })

  it('should track members on here event', () => {
    const sendMessage = () => {}
    const channel = new PresenceChannel('chat', sendMessage)

    let receivedUsers: unknown[] = []
    channel.here((users) => {
      receivedUsers = users
    })

    channel._handlePresence('members', [
      { id: 1, info: { name: 'John' } },
      { id: 2, info: { name: 'Jane' } },
    ])

    expect(receivedUsers).toHaveLength(2)
    expect(channel.getMembers()).toHaveLength(2)
  })

  it('should notify on user joining', () => {
    const sendMessage = () => {}
    const channel = new PresenceChannel('chat', sendMessage)

    let joinedUser: unknown = null
    channel.joining((user) => {
      joinedUser = user
    })

    channel._handlePresence('join', { id: 3, info: { name: 'Bob' } })

    expect(joinedUser).toEqual({ id: 3, info: { name: 'Bob' } })
    expect(channel.getMembers()).toHaveLength(1)
  })

  it('should notify on user leaving', () => {
    const sendMessage = () => {}
    const channel = new PresenceChannel('chat', sendMessage)

    // Add initial members
    channel._handlePresence('members', [
      { id: 1, info: { name: 'John' } },
      { id: 2, info: { name: 'Jane' } },
    ])

    let leftUser: unknown = null
    channel.leaving((user) => {
      leftUser = user
    })

    channel._handlePresence('leave', { id: 1, info: { name: 'John' } })

    expect(leftUser).toEqual({ id: 1, info: { name: 'John' } })
    expect(channel.getMembers()).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────
// RippleClient Tests
// ─────────────────────────────────────────────────────────────

describe('RippleClient', () => {
  class MockWebSocket {
    static instances: MockWebSocket[] = []
    static OPEN = 1
    static CLOSED = 3

    readyState = MockWebSocket.OPEN
    onopen?: () => void
    onmessage?: (event: { data: string }) => void
    onclose?: () => void
    onerror?: (error: unknown) => void
    sent: string[] = []

    constructor(public url: string) {
      MockWebSocket.instances.push(this)
    }

    send(data: string) {
      this.sent.push(data)
    }

    close() {
      this.readyState = MockWebSocket.CLOSED
      this.onclose?.()
    }

    emitOpen() {
      this.onopen?.()
    }

    emitMessage(data: string) {
      this.onmessage?.({ data })
    }
  }

  const originalWebSocket = globalThis.WebSocket

  beforeAll(() => {
    globalThis.WebSocket = MockWebSocket as any
  })

  afterAll(() => {
    globalThis.WebSocket = originalWebSocket
  })

  it('should create with default config', () => {
    const client = new RippleClient({ host: 'ws://localhost:3000/ws' })
    expect(client.config.host).toBe('ws://localhost:3000/ws')
    expect(client.config.authEndpoint).toBe('/broadcasting/auth')
    expect(client.config.autoReconnect).toBe(true)
  })

  it('should create with custom config', () => {
    const client = new RippleClient({
      host: 'ws://localhost:3000/ws',
      authEndpoint: '/api/auth',
      autoReconnect: false,
      reconnectDelay: 2000,
    })

    expect(client.config.authEndpoint).toBe('/api/auth')
    expect(client.config.autoReconnect).toBe(false)
    expect(client.config.reconnectDelay).toBe(2000)
  })

  it('should start with disconnected state', () => {
    const client = new RippleClient({ host: 'ws://localhost:3000/ws' })
    expect(client.getState()).toBe('disconnected')
  })

  it('should have null socketId initially', () => {
    const client = new RippleClient({ host: 'ws://localhost:3000/ws' })
    expect(client.getSocketId()).toBeNull()
  })

  it('connects and processes pending subscriptions', async () => {
    const client = new RippleClient({ host: 'ws://localhost', autoReconnect: false })
    client.channel('news')

    const connectPromise = client.connect()
    const ws = MockWebSocket.instances.at(-1)!

    ws.emitOpen()
    ws.emitMessage(JSON.stringify({ type: 'connected', socketId: 'socket-1' }))

    await connectPromise

    expect(client.getState()).toBe('connected')
    expect(client.getSocketId()).toBe('socket-1')
    expect(ws.sent.some((msg) => msg.includes('"subscribe"') && msg.includes('news'))).toBe(true)
  })

  it('authenticates private and presence channels', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(
      async () => new Response(JSON.stringify({ auth: 'sig' }), { status: 200 })
    )

    const client = new RippleClient({ host: 'ws://localhost', autoReconnect: false })
    client.private('orders')
    client.join('room')

    const connectPromise = client.connect()
    const ws = MockWebSocket.instances.at(-1)!
    ws.emitOpen()
    ws.emitMessage(JSON.stringify({ type: 'connected', socketId: 'socket-2' }))
    await connectPromise
    await new Promise((resolve) => setTimeout(resolve, 0))

    const sent = ws.sent.join('\n')
    expect(sent).toContain('private-orders')
    expect(sent).toContain('presence-room')
    expect(sent).toContain('"signature":"sig"')

    globalThis.fetch = originalFetch
  })

  it('dispatches event and presence messages', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(
      async () => new Response(JSON.stringify({ auth: 'sig' }), { status: 200 })
    )

    const client = new RippleClient({
      host: 'ws://localhost',
      autoReconnect: false,
      authEndpoint: 'http://localhost/auth',
    })
    const channel = client.channel('news')
    let received: unknown = null
    channel.listen('Update', (data) => {
      received = data
    })

    const presence = client.join('room')
    let hereCalled = false
    presence.here((users) => {
      hereCalled = users.length === 1
    })

    const connectPromise = client.connect()
    const ws = MockWebSocket.instances.at(-1)!
    ws.emitOpen()
    ws.emitMessage(JSON.stringify({ type: 'connected', socketId: 'socket-3' }))
    await connectPromise

    ws.emitMessage(
      JSON.stringify({ type: 'event', channel: 'news', event: 'Update', data: { ok: true } })
    )
    ws.emitMessage(
      JSON.stringify({
        type: 'presence',
        channel: 'presence-room',
        event: 'members',
        data: [{ id: 1 }],
      })
    )

    expect(received).toEqual({ ok: true })
    expect(hereCalled).toBe(true)

    globalThis.fetch = originalFetch
  })

  it('schedules reconnect on disconnect', async () => {
    const client = new RippleClient({
      host: 'ws://localhost',
      reconnectDelay: 1,
      maxReconnectAttempts: 1,
    })

    const originalSetTimeout = globalThis.setTimeout
    globalThis.setTimeout = ((fn: () => void) => {
      fn()
      return 1 as any
    }) as any

    const connectPromise = client.connect()
    const ws = MockWebSocket.instances.at(-1)!
    ws.emitOpen()
    ws.emitMessage(JSON.stringify({ type: 'connected', socketId: 'socket-4' }))
    await connectPromise

    client.connect = mock(async () => {}) as any
    ws.close()

    expect(client.getState()).toBe('reconnecting')
    expect((client.connect as any).mock.calls.length).toBe(1)

    globalThis.setTimeout = originalSetTimeout
  })

  it('disconnects and clears state', () => {
    const client = new RippleClient({ host: 'ws://localhost', autoReconnect: false })
    client.disconnect()

    expect(client.getState()).toBe('disconnected')
    expect(client.getSocketId()).toBeNull()
  })
})

describe('createRippleClient', () => {
  it('should create client instance', () => {
    const client = createRippleClient({ host: 'ws://localhost:3000/ws' })
    expect(client).toBeInstanceOf(RippleClient)
  })
})
