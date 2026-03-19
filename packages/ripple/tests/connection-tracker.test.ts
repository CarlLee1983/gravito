import { beforeEach, describe, expect, it } from 'bun:test'
import { createLogger } from '../src/logging/Logger'
import { DefaultConnectionTracker } from '../src/tracking/ConnectionTracker'

describe('ConnectionTracker', () => {
  let tracker: DefaultConnectionTracker

  beforeEach(() => {
    tracker = new DefaultConnectionTracker()
  })

  describe('onConnect', () => {
    it('should track connected clients', () => {
      tracker.onConnect('client-1')
      expect(tracker.getActiveConnections()).toBe(1)

      tracker.onConnect('client-2')
      expect(tracker.getActiveConnections()).toBe(2)
    })

    it('should initialize connection timestamp', () => {
      tracker.onConnect('client-1')
      const duration = tracker.getConnectionDuration('client-1')
      expect(duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('onDisconnect', () => {
    it('should remove disconnected clients', () => {
      tracker.onConnect('client-1')
      tracker.onConnect('client-2')
      expect(tracker.getActiveConnections()).toBe(2)

      tracker.onDisconnect('client-1', 1000, 'Normal closure')
      expect(tracker.getActiveConnections()).toBe(1)

      tracker.onDisconnect('client-2', 1000, 'Normal closure')
      expect(tracker.getActiveConnections()).toBe(0)
    })

    it('should handle disconnect of non-existent client', () => {
      tracker.onDisconnect('nonexistent', 1000, 'test')
      expect(tracker.getActiveConnections()).toBe(0)
    })
  })

  describe('onSubscribe', () => {
    it('should track channel subscriptions', () => {
      tracker.onConnect('client-1')
      tracker.onSubscribe('client-1', 'channel-1')
      tracker.onSubscribe('client-1', 'channel-2')

      expect(tracker.getActiveConnections()).toBe(1)
    })
  })

  describe('onUnsubscribe', () => {
    it('should track channel unsubscriptions', () => {
      tracker.onConnect('client-1')
      tracker.onSubscribe('client-1', 'channel-1')
      tracker.onUnsubscribe('client-1', 'channel-1')

      expect(tracker.getActiveConnections()).toBe(1)
    })
  })

  describe('onError', () => {
    it('should track client errors', () => {
      tracker.onConnect('client-1')
      tracker.onError('client-1', 'Test error')
      expect(tracker.getActiveConnections()).toBe(1)
    })
  })

  describe('getConnectionDuration', () => {
    it('should return duration for active connection', async () => {
      tracker.onConnect('client-1')
      await Bun.sleep(10)

      const duration = tracker.getConnectionDuration('client-1')
      expect(duration).toBeGreaterThanOrEqual(5)
    })

    it('should return null for non-existent connection', () => {
      const duration = tracker.getConnectionDuration('nonexistent')
      expect(duration).toBeNull()
    })

    it('should return null after disconnect', () => {
      tracker.onConnect('client-1')
      tracker.onDisconnect('client-1', 1000, 'test')

      const duration = tracker.getConnectionDuration('client-1')
      expect(duration).toBeNull()
    })
  })

  describe('getActiveConnections', () => {
    it('should return 0 for no connections', () => {
      expect(tracker.getActiveConnections()).toBe(0)
    })

    it('should track multiple connections', () => {
      tracker.onConnect('client-1')
      tracker.onConnect('client-2')
      tracker.onConnect('client-3')

      expect(tracker.getActiveConnections()).toBe(3)
    })

    it('should update count after disconnects', () => {
      tracker.onConnect('client-1')
      tracker.onConnect('client-2')
      tracker.onConnect('client-3')

      tracker.onDisconnect('client-2', 1000, 'test')

      expect(tracker.getActiveConnections()).toBe(2)
    })
  })

  describe('with custom logger', () => {
    it('should use provided logger', () => {
      const customLogger = createLogger('CustomTracker', 'debug')
      const customTracker = new DefaultConnectionTracker(customLogger)

      customTracker.onConnect('client-1')
      expect(customTracker.getActiveConnections()).toBe(1)
    })
  })
})
