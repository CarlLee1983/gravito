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

      // Give async callback time to execute
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
})
