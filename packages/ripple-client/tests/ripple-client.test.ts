/**
 * @fileoverview Tests for @gravito/ripple-client
 */

import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { Channel, PrivateChannel, PresenceChannel } from '../src/Channel'
import { RippleClient, createRippleClient } from '../src/RippleClient'

// ─────────────────────────────────────────────────────────────
// Channel Tests
// ─────────────────────────────────────────────────────────────

describe('Channel', () => {
    it('should store correct name', () => {
        const sendMessage = () => { }
        const channel = new Channel('test-channel', sendMessage)
        expect(channel.name).toBe('test-channel')
    })

    it('should register event listeners', () => {
        const sendMessage = () => { }
        const channel = new Channel('test', sendMessage)

        let called = false
        channel.listen('event', () => {
            called = true
        })

        channel._dispatch('event', {})
        expect(called).toBe(true)
    })

    it('should support multiple listeners for same event', () => {
        const sendMessage = () => { }
        const channel = new Channel('test', sendMessage)

        let count = 0
        channel.listen('event', () => count++)
        channel.listen('event', () => count++)

        channel._dispatch('event', {})
        expect(count).toBe(2)
    })

    it('should stop listening to specific event', () => {
        const sendMessage = () => { }
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
        const sendMessage = () => { }
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
        const sendMessage = () => { }
        const channel = new PrivateChannel('orders.123', sendMessage)
        expect(channel.name).toBe('private-orders.123')
    })
})

describe('PresenceChannel', () => {
    it('should add presence- prefix to name', () => {
        const sendMessage = () => { }
        const channel = new PresenceChannel('chat.lobby', sendMessage)
        expect(channel.name).toBe('presence-chat.lobby')
    })

    it('should track members on here event', () => {
        const sendMessage = () => { }
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
        const sendMessage = () => { }
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
        const sendMessage = () => { }
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
})

describe('createRippleClient', () => {
    it('should create client instance', () => {
        const client = createRippleClient({ host: 'ws://localhost:3000/ws' })
        expect(client).toBeInstanceOf(RippleClient)
    })
})
