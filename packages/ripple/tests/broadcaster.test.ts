import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test'
import { PresenceChannel, PrivateChannel, PublicChannel } from '../src/channels/Channel'
import { BroadcastEvent } from '../src/events/BroadcastEvent'
import { Broadcaster, broadcast, getRippleServer, setRippleServer } from '../src/events/Broadcaster'
import { RippleServer } from '../src/RippleServer'

describe('Broadcaster', () => {
  describe('Global Server Management', () => {
    it('should return null when no server is set', () => {
      setRippleServer(null as any)
      expect(getRippleServer()).toBeNull()
    })

    it('should set and get global server', async () => {
      const server = new RippleServer()
      setRippleServer(server)

      expect(getRippleServer()).toBe(server)

      setRippleServer(null as any)
      await server.shutdown()
    })

    it('should allow resetting server to null', async () => {
      const server = new RippleServer()
      setRippleServer(server)
      setRippleServer(null as any)

      expect(getRippleServer()).toBeNull()

      await server.shutdown()
    })
  })

  describe('Static Methods', () => {
    let server: RippleServer

    beforeEach(() => {
      server = new RippleServer()
      setRippleServer(server)
    })

    afterEach(async () => {
      setRippleServer(null as any)
      await server.shutdown()
    })

    it('should create public channel broadcaster', () => {
      const broadcaster = Broadcaster.to('chat') as any
      expect(broadcaster._channel).toBe('chat')
    })

    it('should create private channel broadcaster with prefix', () => {
      const broadcaster = Broadcaster.toPrivate('orders.123') as any
      expect(broadcaster._channel).toBe('private-orders.123')
    })

    it('should create presence channel broadcaster with prefix', () => {
      const broadcaster = Broadcaster.toPresence('room.lobby') as any
      expect(broadcaster._channel).toBe('presence-room.lobby')
    })

    it('should create broadcasters with different channel types', () => {
      const public1 = Broadcaster.to('news') as any
      const private1 = Broadcaster.toPrivate('admin') as any
      const presence1 = Broadcaster.toPresence('support') as any

      expect(public1._channel).toBe('news')
      expect(private1._channel).toBe('private-admin')
      expect(presence1._channel).toBe('presence-support')
    })
  })

  describe('except()', () => {
    let server: RippleServer

    beforeEach(() => {
      server = new RippleServer()
      setRippleServer(server)
    })

    afterEach(async () => {
      setRippleServer(null as any)
      await server.shutdown()
    })

    it('should add single socket ID to exclusion list', () => {
      const broadcaster = Broadcaster.to('chat').except('socket-1') as any
      expect(broadcaster._except).toContain('socket-1')
      expect(broadcaster._except.length).toBe(1)
    })

    it('should add multiple socket IDs to exclusion list from array', () => {
      const broadcaster = Broadcaster.to('chat').except(['socket-1', 'socket-2']) as any
      expect(broadcaster._except).toContain('socket-1')
      expect(broadcaster._except).toContain('socket-2')
      expect(broadcaster._except.length).toBe(2)
    })

    it('should chain multiple except calls', () => {
      const broadcaster = Broadcaster.to('chat')
        .except('socket-1')
        .except('socket-2')
        .except(['socket-3', 'socket-4']) as any

      expect(broadcaster._except.length).toBe(4)
      expect(broadcaster._except).toContain('socket-1')
      expect(broadcaster._except).toContain('socket-2')
      expect(broadcaster._except).toContain('socket-3')
      expect(broadcaster._except).toContain('socket-4')
    })

    it('should accumulate exclusions across chained calls', () => {
      const broadcaster = Broadcaster.to('chat')
        .except('alice')
        .except(['bob', 'charlie'])
        .except('dave') as any

      expect(broadcaster._except).toEqual(['alice', 'bob', 'charlie', 'dave'])
    })

    it('should allow duplicate socket IDs in exception list', () => {
      const broadcaster = Broadcaster.to('chat').except('socket-1').except('socket-1') as any

      expect(broadcaster._except.length).toBe(2)
    })
  })

  describe('emit()', () => {
    let server: RippleServer

    beforeEach(() => {
      server = new RippleServer()
      setRippleServer(server)
    })

    afterEach(async () => {
      setRippleServer(null as any)
      await server.shutdown()
    })

    it('should call server.broadcast with correct parameters', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      Broadcaster.to('news').emit('ArticlePublished', { title: 'Hello' })

      expect(broadcastSpy).toHaveBeenCalledWith('news', 'ArticlePublished', { title: 'Hello' })
    })

    it('should broadcast to private channel', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      Broadcaster.toPrivate('orders.123').emit('OrderUpdated', { status: 'shipped' })

      expect(broadcastSpy).toHaveBeenCalledWith('private-orders.123', 'OrderUpdated', {
        status: 'shipped',
      })
    })

    it('should broadcast to presence channel', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      Broadcaster.toPresence('chat.lobby').emit('NewMessage', { text: 'Hi!' })

      expect(broadcastSpy).toHaveBeenCalledWith('presence-chat.lobby', 'NewMessage', {
        text: 'Hi!',
      })
    })

    it('should warn when no server configured', () => {
      setRippleServer(null as any)
      const warnSpy = vi.spyOn(console, 'warn')

      Broadcaster.to('chat').emit('test', {})

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No server configured'))
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Use BroadcastManager instead'))

      warnSpy.mockRestore()
    })

    it('should not call broadcast when server is null', () => {
      setRippleServer(null as any)

      expect(() => {
        Broadcaster.to('chat').emit('test', {})
      }).not.toThrow()
    })

    it('should emit with complex data payloads', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      const complexData = {
        user: { id: 123, name: 'Alice' },
        items: [1, 2, 3],
        metadata: { timestamp: Date.now() },
      }

      Broadcaster.to('updates').emit('DataSync', complexData)

      expect(broadcastSpy).toHaveBeenCalledWith('updates', 'DataSync', complexData)
    })
  })

  describe('broadcast() function', () => {
    let server: RippleServer

    beforeEach(() => {
      server = new RippleServer()
      setRippleServer(server)
    })

    afterEach(async () => {
      setRippleServer(null as any)
      await server.shutdown()
    })

    it('should broadcast event to single channel', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      class TestEvent extends BroadcastEvent {
        constructor(public data: string) {
          super()
        }

        broadcastOn() {
          return new PublicChannel('test')
        }
      }

      broadcast(new TestEvent('hello'))

      expect(broadcastSpy).toHaveBeenCalledWith('test', 'TestEvent', { data: 'hello' })
    })

    it('should broadcast to multiple channels', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      class MultiChannelEvent extends BroadcastEvent {
        broadcastOn() {
          return [
            new PublicChannel('channel-1'),
            new PublicChannel('channel-2'),
            new PrivateChannel('admin'),
          ]
        }
      }

      broadcast(new MultiChannelEvent())

      expect(broadcastSpy).toHaveBeenCalledTimes(3)
      expect(broadcastSpy).toHaveBeenCalledWith('channel-1', 'MultiChannelEvent', {})
      expect(broadcastSpy).toHaveBeenCalledWith('channel-2', 'MultiChannelEvent', {})
      expect(broadcastSpy).toHaveBeenCalledWith('private-admin', 'MultiChannelEvent', {})
    })

    it('should use custom event name from broadcastAs()', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      class OrderShipped extends BroadcastEvent {
        constructor(public orderId: number) {
          super()
        }

        broadcastOn() {
          return new PrivateChannel(`orders.${this.orderId}`)
        }

        broadcastAs() {
          return 'order.shipped'
        }
      }

      broadcast(new OrderShipped(123))

      expect(broadcastSpy).toHaveBeenCalledWith('private-orders.123', 'order.shipped', {
        orderId: 123,
      })
    })

    it('should use default event name when broadcastAs() not overridden', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      class DefaultNameEvent extends BroadcastEvent {
        broadcastOn() {
          return new PublicChannel('test')
        }
      }

      broadcast(new DefaultNameEvent())

      expect(broadcastSpy).toHaveBeenCalledWith('test', 'DefaultNameEvent', {})
    })

    it('should broadcast custom data from broadcastWith()', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      class CustomDataEvent extends BroadcastEvent {
        constructor(
          public userId: number,
          public privateData: string
        ) {
          super()
        }

        broadcastOn() {
          return new PublicChannel('users')
        }

        broadcastWith() {
          return { userId: this.userId }
        }
      }

      broadcast(new CustomDataEvent(456, 'secret'))

      expect(broadcastSpy).toHaveBeenCalledWith('users', 'CustomDataEvent', { userId: 456 })
    })

    it('should warn when broadcasting without server', () => {
      setRippleServer(null as any)
      const warnSpy = vi.spyOn(console, 'warn')

      class TestEvent extends BroadcastEvent {
        broadcastOn() {
          return new PublicChannel('test')
        }
      }

      broadcast(new TestEvent())

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No server configured'))

      warnSpy.mockRestore()
    })

    it('should not throw when broadcasting without server', () => {
      setRippleServer(null as any)

      class TestEvent extends BroadcastEvent {
        broadcastOn() {
          return new PublicChannel('test')
        }
      }

      expect(() => broadcast(new TestEvent())).not.toThrow()
    })

    it('should broadcast to presence channel with user info', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      class UserJoined extends BroadcastEvent {
        constructor(public user: { id: number; name: string }) {
          super()
        }

        broadcastOn() {
          return new PresenceChannel('lobby')
        }
      }

      broadcast(new UserJoined({ id: 1, name: 'Alice' }))

      expect(broadcastSpy).toHaveBeenCalledWith('presence-lobby', 'UserJoined', {
        user: { id: 1, name: 'Alice' },
      })
    })

    it('should handle events with no additional properties', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      class EmptyEvent extends BroadcastEvent {
        broadcastOn() {
          return new PublicChannel('events')
        }
      }

      broadcast(new EmptyEvent())

      expect(broadcastSpy).toHaveBeenCalledWith('events', 'EmptyEvent', {})
    })

    it('should broadcast events with nested objects', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      class ComplexEvent extends BroadcastEvent {
        constructor(
          public payload: {
            user: { id: number; profile: { name: string } }
            metadata: { timestamp: number }
          }
        ) {
          super()
        }

        broadcastOn() {
          return new PublicChannel('complex')
        }
      }

      const event = new ComplexEvent({
        user: { id: 1, profile: { name: 'Bob' } },
        metadata: { timestamp: 123456 },
      })

      broadcast(event)

      expect(broadcastSpy).toHaveBeenCalledWith('complex', 'ComplexEvent', {
        payload: {
          user: { id: 1, profile: { name: 'Bob' } },
          metadata: { timestamp: 123456 },
        },
      })
    })
  })

  describe('Integration between Broadcaster and broadcast()', () => {
    let server: RippleServer

    beforeEach(() => {
      server = new RippleServer()
      setRippleServer(server)
    })

    afterEach(async () => {
      setRippleServer(null as any)
      await server.shutdown()
    })

    it('should use same server instance', () => {
      const broadcastSpy = vi.spyOn(server, 'broadcast')

      Broadcaster.to('channel-1').emit('Event1', { a: 1 })

      class Event2 extends BroadcastEvent {
        broadcastOn() {
          return new PublicChannel('channel-2')
        }
      }
      broadcast(new Event2())

      expect(broadcastSpy).toHaveBeenCalledTimes(2)
    })

    it('should both fail gracefully when server not set', () => {
      setRippleServer(null as any)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      Broadcaster.to('test').emit('Event1', {})

      class TestEvent extends BroadcastEvent {
        broadcastOn() {
          return new PublicChannel('test')
        }
      }
      broadcast(new TestEvent())

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No server configured'))
      expect(warnSpy.mock.calls.length).toBeGreaterThanOrEqual(2)

      warnSpy.mockRestore()
    })
  })
})
