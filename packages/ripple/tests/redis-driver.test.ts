import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { RedisDriver } from '../src/drivers/RedisDriver'

describe('RedisDriver', () => {
  let driver: RedisDriver

  beforeEach(async () => {
    driver = new RedisDriver({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT || '6379'),
      db: 15, // Use a separate DB for testing
      keyPrefix: 'test:ripple:',
    })
  })

  afterEach(async () => {
    await driver.shutdown()
  })

  it('should initialize and shutdown successfully', async () => {
    try {
      await driver.init()
      expect(driver.name).toBe('redis')
      await driver.shutdown()
    } catch (error) {
      // If Redis is not available, skip this test
      if (error instanceof Error && error.message.includes('ioredis')) {
        console.warn('Skipping Redis tests: ioredis not installed')
        return
      }
      throw error
    }
  })

  it('should publish and receive messages', async () => {
    try {
      await driver.init()
    } catch (error) {
      // Skip if Redis not available
      if (error instanceof Error && error.message.includes('ioredis')) {
        console.warn('Skipping Redis tests: ioredis not installed')
        return
      }
      throw error
    }

    const receivedMessages: Array<{ event: string; data: unknown }> = []

    // Subscribe to a channel
    await driver.subscribe('test-channel', (event, data) => {
      receivedMessages.push({ event, data })
    })

    // Give subscription time to register
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Publish a message
    await driver.publish('test-channel', 'test-event', { message: 'Hello, Redis!' })

    // Wait for message to be received
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(receivedMessages.length).toBe(1)
    expect(receivedMessages[0].event).toBe('test-event')
    expect(receivedMessages[0].data).toEqual({ message: 'Hello, Redis!' })
  })

  it('should handle multiple subscribers to the same channel', async () => {
    try {
      await driver.init()
    } catch (error) {
      if (error instanceof Error && error.message.includes('ioredis')) {
        console.warn('Skipping Redis tests: ioredis not installed')
        return
      }
      throw error
    }

    const messages1: unknown[] = []
    const messages2: unknown[] = []

    await driver.subscribe('multi-channel', (event, data) => {
      messages1.push(data)
    })

    await driver.subscribe('multi-channel', (event, data) => {
      messages2.push(data)
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    await driver.publish('multi-channel', 'test', { value: 42 })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(messages1.length).toBe(1)
    expect(messages2.length).toBe(1)
    expect(messages1[0]).toEqual({ value: 42 })
    expect(messages2[0]).toEqual({ value: 42 })
  })

  it('should support channel prefix', async () => {
    try {
      await driver.init()
    } catch (error) {
      if (error instanceof Error && error.message.includes('ioredis')) {
        console.warn('Skipping Redis tests: ioredis not installed')
        return
      }
      throw error
    }

    const received: unknown[] = []

    await driver.subscribe('prefixed', (event, data) => {
      received.push(data)
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // The driver should automatically add the prefix
    await driver.publish('prefixed', 'event', { prefixed: true })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(received.length).toBe(1)
    expect(received[0]).toEqual({ prefixed: true })
  })

  it('should handle unsubscribe', async () => {
    try {
      await driver.init()
    } catch (error) {
      if (error instanceof Error && error.message.includes('ioredis')) {
        console.warn('Skipping Redis tests: ioredis not installed')
        return
      }
      throw error
    }

    const received: unknown[] = []

    await driver.subscribe('unsub-test', (event, data) => {
      received.push(data)
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Publish before unsubscribe
    await driver.publish('unsub-test', 'event', { before: true })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Unsubscribe
    await driver.unsubscribe('unsub-test')

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Publish after unsubscribe
    await driver.publish('unsub-test', 'event', { after: true })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Should only receive the first message
    expect(received.length).toBe(1)
    expect(received[0]).toEqual({ before: true })
  })

  it('should throw error if publish before init', async () => {
    const uninitDriver = new RedisDriver()

    try {
      await uninitDriver.publish('test', 'event', {})
      expect(true).toBe(false) // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('not initialized')
    }
  })

  it('should throw error if subscribe before init', async () => {
    const uninitDriver = new RedisDriver()

    try {
      await uninitDriver.subscribe('test', () => {})
      expect(true).toBe(false) // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('not initialized')
    }
  })
})
