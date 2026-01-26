/**
 * @fileoverview Tests for BroadcastManager
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { PresenceChannel, PrivateChannel, PublicChannel } from '../src/channels'
import { BroadcastEvent } from '../src/events/BroadcastEvent'
import { BroadcastManager, ChannelBroadcaster } from '../src/events/BroadcastManager'
import type { RippleServer } from '../src/RippleServer'

describe('BroadcastManager', () => {
  let mockServer: RippleServer
  let manager: BroadcastManager
  let broadcastCalls: Array<{ channel: string; eventName: string; data: unknown }>

  beforeEach(() => {
    broadcastCalls = []
    mockServer = {
      broadcast: mock((channel: string, eventName: string, data: unknown) => {
        broadcastCalls.push({ channel, eventName, data })
      }),
    } as unknown as RippleServer

    manager = new BroadcastManager(mockServer)
  })

  describe('broadcast()', () => {
    it('should broadcast event to single channel', () => {
      class TestEvent extends BroadcastEvent {
        broadcastOn() {
          return new PublicChannel('news')
        }
        broadcastAs() {
          return 'TestEvent'
        }
        broadcastWith() {
          return { message: 'hello' }
        }
      }

      manager.broadcast(new TestEvent())

      expect(broadcastCalls).toHaveLength(1)
      expect(broadcastCalls[0]).toEqual({
        channel: 'news',
        eventName: 'TestEvent',
        data: { message: 'hello' },
      })
    })

    it('should broadcast event to multiple channels', () => {
      class MultiChannelEvent extends BroadcastEvent {
        broadcastOn() {
          return [new PublicChannel('news'), new PublicChannel('updates')]
        }
        broadcastAs() {
          return 'MultiEvent'
        }
        broadcastWith() {
          return { id: 123 }
        }
      }

      manager.broadcast(new MultiChannelEvent())

      expect(broadcastCalls).toHaveLength(2)
      expect(broadcastCalls[0].channel).toBe('news')
      expect(broadcastCalls[1].channel).toBe('updates')
      expect(broadcastCalls[0].eventName).toBe('MultiEvent')
      expect(broadcastCalls[1].eventName).toBe('MultiEvent')
    })

    it('should broadcast to private channel', () => {
      class PrivateEvent extends BroadcastEvent {
        broadcastOn() {
          return new PrivateChannel('orders.123')
        }
        broadcastAs() {
          return 'OrderUpdated'
        }
        broadcastWith() {
          return { status: 'shipped' }
        }
      }

      manager.broadcast(new PrivateEvent())

      expect(broadcastCalls).toHaveLength(1)
      expect(broadcastCalls[0].channel).toBe('private-orders.123')
    })

    it('should broadcast to presence channel', () => {
      class PresenceEvent extends BroadcastEvent {
        broadcastOn() {
          return new PresenceChannel('chat.lobby')
        }
        broadcastAs() {
          return 'NewMessage'
        }
        broadcastWith() {
          return { text: 'Hi!' }
        }
      }

      manager.broadcast(new PresenceEvent())

      expect(broadcastCalls).toHaveLength(1)
      expect(broadcastCalls[0].channel).toBe('presence-chat.lobby')
    })
  })

  describe('to()', () => {
    it('should create ChannelBroadcaster for public channel', () => {
      const broadcaster = manager.to('news')

      expect(broadcaster).toBeInstanceOf(ChannelBroadcaster)
    })

    it('should emit to specified channel', () => {
      manager.to('news').emit('ArticlePublished', { title: 'Hello' })

      expect(broadcastCalls).toHaveLength(1)
      expect(broadcastCalls[0]).toEqual({
        channel: 'news',
        eventName: 'ArticlePublished',
        data: { title: 'Hello' },
      })
    })
  })

  describe('toPrivate()', () => {
    it('should create ChannelBroadcaster with private- prefix', () => {
      const broadcaster = manager.toPrivate('orders.123')

      expect(broadcaster).toBeInstanceOf(ChannelBroadcaster)
    })

    it('should emit to private channel with prefix', () => {
      manager.toPrivate('orders.123').emit('OrderShipped', { id: 123 })

      expect(broadcastCalls).toHaveLength(1)
      expect(broadcastCalls[0].channel).toBe('private-orders.123')
      expect(broadcastCalls[0].eventName).toBe('OrderShipped')
      expect(broadcastCalls[0].data).toEqual({ id: 123 })
    })
  })

  describe('toPresence()', () => {
    it('should create ChannelBroadcaster with presence- prefix', () => {
      const broadcaster = manager.toPresence('chat.lobby')

      expect(broadcaster).toBeInstanceOf(ChannelBroadcaster)
    })

    it('should emit to presence channel with prefix', () => {
      manager.toPresence('chat.lobby').emit('NewMessage', { text: 'Hi' })

      expect(broadcastCalls).toHaveLength(1)
      expect(broadcastCalls[0].channel).toBe('presence-chat.lobby')
      expect(broadcastCalls[0].eventName).toBe('NewMessage')
      expect(broadcastCalls[0].data).toEqual({ text: 'Hi' })
    })
  })
})

describe('ChannelBroadcaster', () => {
  let mockServer: RippleServer
  let broadcastCalls: Array<{ channel: string; eventName: string; data: unknown }>

  beforeEach(() => {
    broadcastCalls = []
    mockServer = {
      broadcast: mock((channel: string, eventName: string, data: unknown) => {
        broadcastCalls.push({ channel, eventName, data })
      }),
    } as unknown as RippleServer
  })

  describe('constructor', () => {
    it('should create instance with server and channel', () => {
      const broadcaster = new ChannelBroadcaster(mockServer, 'test-channel')

      expect(broadcaster).toBeInstanceOf(ChannelBroadcaster)
    })
  })

  describe('except()', () => {
    it('should return this for chaining', () => {
      const broadcaster = new ChannelBroadcaster(mockServer, 'news')
      const result = broadcaster.except('socket-1')

      expect(result).toBe(broadcaster)
    })

    it('should accept single socket ID', () => {
      const broadcaster = new ChannelBroadcaster(mockServer, 'news')
      broadcaster.except('socket-1')

      expect(broadcaster).toBeInstanceOf(ChannelBroadcaster)
    })

    it('should accept multiple socket IDs as array', () => {
      const broadcaster = new ChannelBroadcaster(mockServer, 'news')
      broadcaster.except(['socket-1', 'socket-2', 'socket-3'])

      expect(broadcaster).toBeInstanceOf(ChannelBroadcaster)
    })

    it('should support chaining multiple except calls', () => {
      const broadcaster = new ChannelBroadcaster(mockServer, 'news')
      const result = broadcaster
        .except('socket-1')
        .except('socket-2')
        .except(['socket-3', 'socket-4'])

      expect(result).toBe(broadcaster)
    })
  })

  describe('emit()', () => {
    it('should call server.broadcast with channel, event, and data', () => {
      const broadcaster = new ChannelBroadcaster(mockServer, 'news')
      broadcaster.emit('ArticlePublished', { title: 'Test' })

      expect(broadcastCalls).toHaveLength(1)
      expect(broadcastCalls[0]).toEqual({
        channel: 'news',
        eventName: 'ArticlePublished',
        data: { title: 'Test' },
      })
    })

    it('should work after except() chaining', () => {
      const broadcaster = new ChannelBroadcaster(mockServer, 'news')
      broadcaster.except('socket-1').except(['socket-2']).emit('Test', { data: 123 })

      expect(broadcastCalls).toHaveLength(1)
      expect(broadcastCalls[0].channel).toBe('news')
    })

    it('should handle null data', () => {
      const broadcaster = new ChannelBroadcaster(mockServer, 'news')
      broadcaster.emit('TestEvent', null)

      expect(broadcastCalls).toHaveLength(1)
      expect(broadcastCalls[0].data).toBeNull()
    })

    it('should handle undefined data', () => {
      const broadcaster = new ChannelBroadcaster(mockServer, 'news')
      broadcaster.emit('TestEvent', undefined)

      expect(broadcastCalls).toHaveLength(1)
      expect(broadcastCalls[0].data).toBeUndefined()
    })

    it('should handle complex data objects', () => {
      const broadcaster = new ChannelBroadcaster(mockServer, 'news')
      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        timestamp: new Date('2026-01-24'),
      }
      broadcaster.emit('ComplexEvent', complexData)

      expect(broadcastCalls).toHaveLength(1)
      expect(broadcastCalls[0].data).toEqual(complexData)
    })
  })
})
