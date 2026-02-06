import { describe, expect, it } from 'bun:test'
import type { Listener } from '../src'
import { Event } from '../src'
import { ConsoleLogger } from '../src/Logger'
import { PlanetCore } from '../src/PlanetCore'

class SampleEvent extends Event {
  constructor(
    public data: string,
    public _hidden = 'secret'
  ) {
    super()
  }
}

class AnotherEvent extends Event {
  constructor(public value: number) {
    super()
  }
}

class SampleListener implements Listener<SampleEvent> {
  public handled = false
  async handle(_event: SampleEvent): Promise<void> {
    this.handled = true
  }
}

// Listener 類別（非實例），用來測試類別解析
class _SampleListenerClass implements Listener<SampleEvent> {
  async handle(_event: SampleEvent): Promise<void> {
    // 執行處理
  }
}

describe('EventManager (extended)', () => {
  function createCore() {
    return new PlanetCore({ logger: new ConsoleLogger() })
  }

  describe('unlisten', () => {
    it('should remove a registered listener instance', async () => {
      const core = createCore()
      const listener = new SampleListener()

      core.events.listen(SampleEvent, listener)
      core.events.unlisten(SampleEvent, listener)

      await core.events.dispatch(new SampleEvent('test'))
      expect(listener.handled).toBe(false)
    })

    it('should do nothing when event has no listeners', () => {
      const core = createCore()
      const listener = new SampleListener()

      // 不應拋出錯誤
      core.events.unlisten(SampleEvent, listener)
    })

    it('should keep other listeners when one is removed', async () => {
      const core = createCore()
      const listener1 = new SampleListener()
      const listener2 = new SampleListener()

      core.events.listen(SampleEvent, listener1)
      core.events.listen(SampleEvent, listener2)
      core.events.unlisten(SampleEvent, listener1)

      await core.events.dispatch(new SampleEvent('test'))
      expect(listener1.handled).toBe(false)
      expect(listener2.handled).toBe(true)
    })

    it('should support string event names for unlisten', async () => {
      const core = createCore()
      const listener = new SampleListener()

      core.events.listen('CustomEvent', listener)
      core.events.unlisten('CustomEvent', listener)

      const listeners = core.events.getListeners('CustomEvent')
      expect(listeners.length).toBe(0)
    })
  })

  describe('getListeners', () => {
    it('should return empty array when no listeners registered for event', () => {
      const core = createCore()
      const listeners = core.events.getListeners(SampleEvent)
      expect(listeners).toEqual([])
    })

    it('should return listeners for a specific event', () => {
      const core = createCore()
      const listener = new SampleListener()
      core.events.listen(SampleEvent, listener)

      const listeners = core.events.getListeners(SampleEvent)
      expect(listeners.length).toBe(1)
    })

    it('should return all listeners when no event specified', () => {
      const core = createCore()
      const listener1 = new SampleListener()
      const listener2 = new SampleListener()

      core.events.listen(SampleEvent, listener1)
      core.events.listen(AnotherEvent, listener2 as any)

      const allListeners = core.events.getListeners()
      expect(allListeners.length).toBe(2)
    })

    it('should return listeners by string name', () => {
      const core = createCore()
      const listener = new SampleListener()
      core.events.listen('my-event', listener)

      const listeners = core.events.getListeners('my-event')
      expect(listeners.length).toBe(1)
    })
  })

  describe('clear', () => {
    it('should remove all listeners', () => {
      const core = createCore()
      core.events.listen(SampleEvent, new SampleListener())
      core.events.listen(AnotherEvent, new SampleListener() as any)

      core.events.clear()

      const all = core.events.getListeners()
      expect(all.length).toBe(0)
    })
  })

  describe('dispatch with listener class', () => {
    it('should instantiate listener class and call handle', async () => {
      const core = createCore()
      let called = false

      class ClassListener implements Listener<SampleEvent> {
        async handle(_event: SampleEvent): Promise<void> {
          called = true
        }
      }

      core.events.listen(SampleEvent, ClassListener)

      await core.events.dispatch(new SampleEvent('hello'))
      expect(called).toBe(true)
    })
  })

  describe('dispatch with error handling', () => {
    it('should continue with other listeners when one throws', async () => {
      const core = createCore()
      let secondCalled = false

      class ErrorListener implements Listener<SampleEvent> {
        async handle(): Promise<void> {
          throw new Error('Listener error')
        }
      }

      class SuccessListener implements Listener<SampleEvent> {
        async handle(): Promise<void> {
          secondCalled = true
        }
      }

      core.events.listen(SampleEvent, new ErrorListener())
      core.events.listen(SampleEvent, new SuccessListener())

      await core.events.dispatch(new SampleEvent('test'))
      expect(secondCalled).toBe(true)
    })
  })

  describe('dispatch with broadcast', () => {
    it('should broadcast when event implements ShouldBroadcast', async () => {
      const core = createCore()
      const broadcastCalls: any[] = []

      // 設定 broadcast manager
      core.events.setBroadcastManager({
        async broadcast(_event, channel, data, eventName) {
          broadcastCalls.push({ channel, data, eventName })
        },
      })

      class BroadcastableEvent extends Event {
        constructor(public message: string) {
          super()
        }

        broadcastOn(): string {
          return 'test-channel'
        }

        broadcastWith(): Record<string, unknown> {
          return { message: this.message }
        }

        broadcastAs(): string {
          return 'custom.event.name'
        }
      }

      await core.events.dispatch(new BroadcastableEvent('hello'))

      expect(broadcastCalls.length).toBe(1)
      expect(broadcastCalls[0].channel).toEqual({
        name: 'test-channel',
        type: 'public',
      })
      expect(broadcastCalls[0].data).toEqual({ message: 'hello' })
      expect(broadcastCalls[0].eventName).toBe('custom.event.name')
    })

    it('should handle broadcast errors gracefully', async () => {
      const core = createCore()

      core.events.setBroadcastManager({
        async broadcast() {
          throw new Error('Broadcast failed')
        },
      })

      class BroadcastableEvent extends Event {
        broadcastOn(): string {
          return 'channel'
        }
      }

      // 不應拋出錯誤
      await core.events.dispatch(new BroadcastableEvent())
    })

    it('should broadcast with Channel object type', async () => {
      const core = createCore()
      const broadcastCalls: any[] = []

      core.events.setBroadcastManager({
        async broadcast(_event, channel, data, eventName) {
          broadcastCalls.push({ channel, data, eventName })
        },
      })

      class PrivateBroadcastEvent extends Event {
        broadcastOn(): { name: string; type: 'public' | 'private' | 'presence' } {
          return { name: 'private-channel', type: 'private' }
        }
      }

      await core.events.dispatch(new PrivateBroadcastEvent())

      expect(broadcastCalls.length).toBe(1)
      expect(broadcastCalls[0].channel).toEqual({
        name: 'private-channel',
        type: 'private',
      })
    })
  })

  describe('dispatch with queue', () => {
    it('should push to queue when listener has queue options', async () => {
      const core = createCore()
      const pushed: any[] = []

      core.events.setQueueManager({
        async push(job, queue, connection, delay) {
          pushed.push({ job, queue, connection, delay })
        },
      })

      class QueuedListener implements Listener<SampleEvent> {
        async handle(_event: SampleEvent): Promise<void> {
          // 不應直接執行
        }
      }

      core.events.listen(SampleEvent, new QueuedListener(), {
        queue: 'emails',
        delay: 30,
      })

      await core.events.dispatch(new SampleEvent('queued'))

      expect(pushed.length).toBe(1)
      expect(pushed[0].queue).toBe('emails')
      expect(pushed[0].delay).toBe(30)
    })

    it('should use ShouldQueue interface from listener', async () => {
      const core = createCore()
      const pushed: any[] = []

      core.events.setQueueManager({
        async push(job, queue, connection, delay) {
          pushed.push({ job, queue, connection, delay })
        },
      })

      class QueuedListener implements Listener<SampleEvent> {
        queue = 'priority-queue'
        connection = 'redis'
        delay = 10

        async handle(_event: SampleEvent): Promise<void> {
          // 不應直接執行
        }
      }

      core.events.listen(SampleEvent, new QueuedListener())

      await core.events.dispatch(new SampleEvent('queued'))

      expect(pushed.length).toBe(1)
      expect(pushed[0].queue).toBe('priority-queue')
    })
  })

  describe('serializeEvent (via dispatch)', () => {
    it('should serialize public properties excluding _ prefixed and functions', async () => {
      const core = createCore()
      const pushed: any[] = []

      core.events.setQueueManager({
        async push(job) {
          pushed.push(job)
        },
      })

      core.events.listen(SampleEvent, new SampleListener(), { queue: 'test' })

      await core.events.dispatch(new SampleEvent('visible', 'hidden'))

      expect(pushed.length).toBe(1)
      const eventData = (pushed[0] as any).eventData
      expect(eventData.data).toBe('visible')
      // _hidden 以底線開頭，不應被序列化
      expect(eventData._hidden).toBeUndefined()
    })
  })
})
