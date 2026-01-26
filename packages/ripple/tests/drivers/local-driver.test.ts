import { beforeEach, describe, expect, it } from 'bun:test'
import { LocalDriver } from '../../src/drivers/LocalDriver'

describe('LocalDriver', () => {
  let driver: LocalDriver

  beforeEach(() => {
    driver = new LocalDriver()
  })

  describe('getStatus()', () => {
    it('should return uninitialized status before init', () => {
      const status = driver.getStatus()

      expect(status.name).toBe('local')
      expect(status.initialized).toBe(false)
      expect(status.connected).toBe(false)
    })

    it('should return initialized status after init', async () => {
      await driver.init()
      const status = driver.getStatus()

      expect(status.name).toBe('local')
      expect(status.initialized).toBe(true)
      expect(status.connected).toBe(true)
    })

    it('should return uninitialized status after shutdown', async () => {
      await driver.init()
      await driver.shutdown()
      const status = driver.getStatus()

      expect(status.name).toBe('local')
      expect(status.initialized).toBe(false)
      expect(status.connected).toBe(false)
    })
  })

  describe('initialization lifecycle', () => {
    it('should initialize successfully', async () => {
      await driver.init()
      expect(driver.getStatus().initialized).toBe(true)
    })

    it('should clear listeners on shutdown', async () => {
      await driver.init()

      let receivedMessage = false
      await driver.subscribe('test-channel', () => {
        receivedMessage = true
      })

      await driver.shutdown()
      await driver.init()

      await driver.publish('test-channel', 'TestEvent', { data: 'hello' })
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(receivedMessage).toBe(false)
    })
  })

  describe('publish/subscribe', () => {
    beforeEach(async () => {
      await driver.init()
    })

    it('should deliver message to subscriber', async () => {
      let received = false
      let receivedEvent: unknown = null
      let receivedData: unknown = null

      await driver.subscribe('test-channel', (event, data) => {
        received = true
        receivedEvent = event
        receivedData = data
      })

      await driver.publish('test-channel', 'TestEvent', { message: 'hello' })
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(received).toBe(true)
      expect(receivedEvent).toBe('TestEvent')
      expect(receivedData).toEqual({ message: 'hello' })
    })

    it('should support multiple subscribers on same channel', async () => {
      const received: boolean[] = [false, false, false]

      await driver.subscribe('channel', () => {
        received[0] = true
      })
      await driver.subscribe('channel', () => {
        received[1] = true
      })
      await driver.subscribe('channel', () => {
        received[2] = true
      })

      await driver.publish('channel', 'TestEvent', {})
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(received).toEqual([true, true, true])
    })

    it('should not deliver to different channel', async () => {
      let received = false

      await driver.subscribe('channel-a', () => {
        received = true
      })
      await driver.publish('channel-b', 'TestEvent', {})
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(received).toBe(false)
    })

    it('should handle unsubscribe', async () => {
      let callCount = 0

      await driver.subscribe('channel', () => {
        callCount++
      })
      await driver.unsubscribe('channel')

      await driver.publish('channel', 'TestEvent', {})
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(callCount).toBe(0)
    })

    it('should handle unsubscribe of non-existent channel', async () => {
      await driver.unsubscribe('non-existent')

      expect(driver.getStatus().initialized).toBe(true)
    })
  })
})
