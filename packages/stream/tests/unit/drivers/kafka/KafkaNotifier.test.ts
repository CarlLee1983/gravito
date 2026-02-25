import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { KafkaNotifier } from '../../../../src/drivers/kafka/KafkaNotifier'

describe('KafkaNotifier', () => {
  let notifier: KafkaNotifier

  beforeEach(() => {
    notifier = new KafkaNotifier()
  })

  describe('Enable/Disable', () => {
    it('should start disabled', () => {
      expect(notifier.isEnabled()).toBe(false)
    })

    it('should enable', () => {
      notifier.enable()
      expect(notifier.isEnabled()).toBe(true)
    })

    it('should disable', () => {
      notifier.enable()
      notifier.disable()
      expect(notifier.isEnabled()).toBe(false)
    })

    it('should toggle multiple times', () => {
      notifier.enable()
      expect(notifier.isEnabled()).toBe(true)

      notifier.disable()
      expect(notifier.isEnabled()).toBe(false)

      notifier.enable()
      expect(notifier.isEnabled()).toBe(true)
    })
  })

  describe('Notifications', () => {
    it('should call registered callbacks when enabled', async () => {
      const callback = mock(async () => {})
      notifier.enable()
      notifier.registerCallback(['test'], callback)

      notifier.notify('test')

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(callback).toHaveBeenCalledWith('test')
    })

    it('should not call callbacks when disabled', async () => {
      const callback = mock(async () => {})
      notifier.registerCallback(['test'], callback)
      // notifier is disabled by default

      notifier.notify('test')

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(callback).toHaveBeenCalledTimes(0)
    })

    it('should emit notify event', async () => {
      notifier.enable()

      let eventFired = false
      notifier.on('notify', (queue: string) => {
        if (queue === 'test') {
          eventFired = true
        }
      })

      notifier.notify('test')
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(eventFired).toBe(true)
    })
  })

  describe('Multiple Callbacks', () => {
    it('should call all callbacks for a queue', async () => {
      const callback1 = mock(async () => {})
      const callback2 = mock(async () => {})

      notifier.enable()
      notifier.registerCallback(['test'], callback1)
      notifier.registerCallback(['test'], callback2)

      notifier.notify('test')

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback1).toHaveBeenCalledWith('test')
      expect(callback2).toHaveBeenCalledWith('test')
    })

    it('should handle multiple queues', async () => {
      const callback1 = mock(async () => {})
      const callback2 = mock(async () => {})

      notifier.enable()
      notifier.registerCallback(['queue1', 'queue2'], callback1)
      notifier.registerCallback(['queue2'], callback2)

      notifier.notify('queue1')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback1).toHaveBeenCalledWith('queue1')
      expect(callback2).toHaveBeenCalledTimes(0)

      notifier.notify('queue2')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback1).toHaveBeenCalledWith('queue2')
      expect(callback2).toHaveBeenCalledWith('queue2')
    })
  })

  describe('Error Handling', () => {
    it('should not stop other callbacks if one errors', async () => {
      const errorCallback = mock(async () => {
        throw new Error('Callback error')
      })
      const successCallback = mock(async () => {})

      notifier.enable()
      notifier.registerCallback(['test'], errorCallback)
      notifier.registerCallback(['test'], successCallback)

      notifier.notify('test')

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(errorCallback).toHaveBeenCalled()
      expect(successCallback).toHaveBeenCalled()
    })
  })

  describe('Clear Callbacks', () => {
    it('should clear all callbacks', async () => {
      const callback = mock(async () => {})

      notifier.enable()
      notifier.registerCallback(['test'], callback)
      notifier.clearCallbacks()

      notifier.notify('test')

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalledTimes(0)
    })

    it('should remove all event listeners', () => {
      let listenerCount = 0

      notifier.on('notify', () => {
        listenerCount++
      })

      notifier.on('notify', () => {
        listenerCount++
      })

      notifier.clearCallbacks()

      notifier.emit('notify', 'test')
      expect(listenerCount).toBe(0)
    })
  })

  describe('Non-Existent Queues', () => {
    it('should not error on notify for unregistered queue', () => {
      notifier.enable()

      // Should not throw
      notifier.notify('nonexistent')
    })
  })

  describe('Reactivation', () => {
    it('should resume notifications after disabling', async () => {
      const callback = mock(async () => {})

      notifier.enable()
      notifier.registerCallback(['test'], callback)

      notifier.notify('test')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalledTimes(1)

      notifier.disable()
      notifier.notify('test')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalledTimes(1)

      notifier.enable()
      notifier.notify('test')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  describe('Concurrent Notifications', () => {
    it('should handle concurrent notify calls', async () => {
      const callback1 = mock(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
      const callback2 = mock(async () => {})

      notifier.enable()
      notifier.registerCallback(['queue1'], callback1)
      notifier.registerCallback(['queue2'], callback2)

      notifier.notify('queue1')
      notifier.notify('queue2')

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })
  })

  describe('Typed Events - Message Arrival', () => {
    it('should emit messageArrived event with count', async () => {
      notifier.enable()

      const events: Array<any> = []
      notifier.onMessageArrived(event => events.push(event))

      notifier.notifyWithCount('test', 5)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(events).toHaveLength(1)
      expect(events[0]!.queue).toBe('test')
      expect(events[0]!.count).toBe(5)
      expect(events[0]!.timestamp).toBeGreaterThan(0)
    })

    it('should include timestamp in messageArrived event', async () => {
      notifier.enable()

      const before = Date.now()
      let eventTimestamp = 0

      notifier.onMessageArrived(event => {
        eventTimestamp = event.timestamp
      })

      notifier.notifyWithCount('test', 1)

      await new Promise((resolve) => setTimeout(resolve, 10))

      const after = Date.now()

      expect(eventTimestamp).toBeGreaterThanOrEqual(before)
      expect(eventTimestamp).toBeLessThanOrEqual(after)
    })

    it('should emit messageArrived with correct count for multiple messages', async () => {
      notifier.enable()

      const counts: number[] = []
      notifier.onMessageArrived(event => counts.push(event.count))

      notifier.notifyWithCount('queue1', 10)
      notifier.notifyWithCount('queue2', 20)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(counts).toEqual([10, 20])
    })
  })

  describe('Typed Events - Callback Completed', () => {
    it('should emit callbackCompleted event on success', async () => {
      notifier.enable()

      const callback = mock(async () => {})
      notifier.registerCallback(['test'], callback)

      const events: Array<any> = []
      notifier.onCallbackCompleted(event => events.push(event))

      notifier.notifyWithCount('test', 1)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(events).toHaveLength(1)
      expect(events[0]!.queue).toBe('test')
      expect(events[0]!.success).toBe(true)
      expect(events[0]!.duration).toBeGreaterThanOrEqual(0)
      expect(events[0]!.error).toBeUndefined()
    })

    it('should emit callbackCompleted event on failure', async () => {
      notifier.enable()

      const callback = mock(async () => {
        throw new Error('Test error')
      })
      notifier.registerCallback(['test'], callback)

      const events: Array<any> = []
      notifier.onCallbackCompleted(event => events.push(event))

      notifier.notifyWithCount('test', 1)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(events).toHaveLength(1)
      expect(events[0]!.queue).toBe('test')
      expect(events[0]!.success).toBe(false)
      expect(events[0]!.error).toBeDefined()
      expect(events[0]!.error.message).toBe('Test error')
    })

    it('should track callback duration', async () => {
      notifier.enable()

      const callback = mock(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
      notifier.registerCallback(['test'], callback)

      const durations: number[] = []
      notifier.onCallbackCompleted(event => durations.push(event.duration))

      notifier.notifyWithCount('test', 1)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(durations).toHaveLength(1)
      expect(durations[0]!).toBeGreaterThanOrEqual(20)
    })

    it('should emit separate events for multiple callbacks', async () => {
      notifier.enable()

      const callback1 = mock(async () => {})
      const callback2 = mock(async () => {})

      notifier.registerCallback(['test'], callback1)
      notifier.registerCallback(['test'], callback2)

      const events: Array<any> = []
      notifier.onCallbackCompleted(event => events.push(event))

      notifier.notifyWithCount('test', 1)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(events).toHaveLength(2)
      expect(events[0]!.queue).toBe('test')
      expect(events[1]!.queue).toBe('test')
    })

    it('should continue emitting even if callback throws non-Error', async () => {
      notifier.enable()

      const callback = mock(async () => {
        throw 'String error' // Non-Error throw
      })
      notifier.registerCallback(['test'], callback)

      const events: Array<any> = []
      notifier.onCallbackCompleted(event => events.push(event))

      notifier.notifyWithCount('test', 1)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(events).toHaveLength(1)
      expect(events[0]!.success).toBe(false)
      expect(events[0]!.error).toBeDefined()
      expect(events[0]!.error.message).toBe('String error')
    })
  })

  describe('Backward Compatibility', () => {
    it('should emit notify event when using notifyWithCount', async () => {
      notifier.enable()

      let notifyFired = false
      notifier.on('notify', (queue: string) => {
        if (queue === 'test') {
          notifyFired = true
        }
      })

      notifier.notifyWithCount('test', 5)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(notifyFired).toBe(true)
    })

    it('should call callbacks with notifyWithCount', async () => {
      notifier.enable()

      const callback = mock(async () => {})
      notifier.registerCallback(['test'], callback)

      notifier.notifyWithCount('test', 10)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalledWith('test')
    })

    it('should handle notify() with count=1', async () => {
      notifier.enable()

      const events: Array<any> = []
      notifier.onMessageArrived(event => events.push(event))

      notifier.notify('test')

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(events).toHaveLength(1)
      expect(events[0]!.count).toBe(1)
    })

    it('should respect enabled state with notifyWithCount', async () => {
      const callback = mock(async () => {})
      notifier.registerCallback(['test'], callback)

      notifier.notifyWithCount('test', 5) // disabled

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalledTimes(0)

      notifier.enable()
      notifier.notifyWithCount('test', 5)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})
