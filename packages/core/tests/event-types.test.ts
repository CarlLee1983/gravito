import { describe, expect, it } from 'bun:test'
import { type Channel, Event, type ShouldBroadcast } from '../src/types/events'

// 建立測試用的 Event 子類別

/** 不實作 broadcast 的簡單事件 */
class SimpleEvent extends Event {
  constructor(public readonly data: string) {
    super()
  }
}

/** 實作 ShouldBroadcast 的事件 */
class BroadcastEvent extends Event implements ShouldBroadcast {
  constructor(
    public readonly message: string,
    public readonly _private: string = 'hidden'
  ) {
    super()
  }

  broadcastOn(): string {
    return 'notifications'
  }
}

/** 帶有自定義 broadcastWith 的事件 */
class CustomBroadcastEvent extends Event implements ShouldBroadcast {
  constructor(
    public readonly userId: number,
    public readonly action: string
  ) {
    super()
  }

  broadcastOn(): Channel {
    return { name: 'user-actions', type: 'private' }
  }

  broadcastWith(): Record<string, unknown> {
    return { userId: this.userId, action: this.action, timestamp: 123 }
  }

  broadcastAs(): string {
    return 'user.action'
  }
}

/** 帶有函式屬性和底線前綴屬性的事件 */
class EventWithSpecialProps extends Event implements ShouldBroadcast {
  public readonly name = 'test'
  public readonly _internal = 'should be hidden'
  public doSomething = () => 'function'

  broadcastOn(): string {
    return 'test-channel'
  }
}

describe('Event base class', () => {
  describe('shouldBroadcast', () => {
    it('should return false for events without broadcastOn', () => {
      const event = new SimpleEvent('hello')
      expect(event.shouldBroadcast()).toBe(false)
    })

    it('should return true for events implementing ShouldBroadcast', () => {
      const event = new BroadcastEvent('hello')
      expect(event.shouldBroadcast()).toBe(true)
    })

    it('should return true for events with custom broadcast', () => {
      const event = new CustomBroadcastEvent(1, 'login')
      expect(event.shouldBroadcast()).toBe(true)
    })
  })

  describe('getBroadcastChannel', () => {
    it('should return null for non-broadcast events', () => {
      const event = new SimpleEvent('hello')
      expect(event.getBroadcastChannel()).toBeNull()
    })

    it('should return channel name string', () => {
      const event = new BroadcastEvent('hello')
      expect(event.getBroadcastChannel()).toBe('notifications')
    })

    it('should return Channel object', () => {
      const event = new CustomBroadcastEvent(1, 'login')
      const channel = event.getBroadcastChannel() as Channel
      expect(channel).toBeDefined()
      expect(channel.name).toBe('user-actions')
      expect(channel.type).toBe('private')
    })
  })

  describe('getBroadcastData', () => {
    it('should return empty object for non-broadcast events', () => {
      const event = new SimpleEvent('hello')
      const data = event.getBroadcastData()
      expect(data).toEqual({})
    })

    it('should use broadcastWith when provided', () => {
      const event = new CustomBroadcastEvent(42, 'purchase')
      const data = event.getBroadcastData()
      expect(data).toEqual({
        userId: 42,
        action: 'purchase',
        timestamp: 123,
      })
    })

    it('should use public properties as default broadcast data', () => {
      const event = new BroadcastEvent('hello')
      const data = event.getBroadcastData()

      // 應包含 message（公開屬性）
      expect(data.message).toBe('hello')
      // 不應包含 _private（底線前綴）
      expect(data._private).toBeUndefined()
    })

    it('should exclude underscore-prefixed properties', () => {
      const event = new EventWithSpecialProps()
      const data = event.getBroadcastData()

      expect(data.name).toBe('test')
      expect(data._internal).toBeUndefined()
    })

    it('should exclude function properties', () => {
      const event = new EventWithSpecialProps()
      const data = event.getBroadcastData()

      expect(data.doSomething).toBeUndefined()
    })
  })

  describe('getBroadcastEventName', () => {
    it('should return class name for non-broadcast events', () => {
      const event = new SimpleEvent('hello')
      expect(event.getBroadcastEventName()).toBe('SimpleEvent')
    })

    it('should return class name when broadcastAs not defined', () => {
      const event = new BroadcastEvent('hello')
      expect(event.getBroadcastEventName()).toBe('BroadcastEvent')
    })

    it('should return custom name from broadcastAs', () => {
      const event = new CustomBroadcastEvent(1, 'login')
      expect(event.getBroadcastEventName()).toBe('user.action')
    })
  })
})
