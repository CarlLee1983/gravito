import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisDriver } from '../../src/drivers/RedisDriver'
import { MockRedis } from '../mock-redis'

describe('RedisDriver Integration Tests', () => {
  let driver: RedisDriver
  let mockRedis: MockRedis
  let mockSubscriber: MockRedis
  let messageHandlers: Map<string, (channel: string, message: string) => void>
  let eventHandlers: Map<string, Map<string, Function>>
  let publishCalls: Array<{ channel: string; message: string }>
  let subscribeCalls: string[]
  let unsubscribeCalls: string[]
  let quitCalls: { redis: number; subscriber: number }

  beforeEach(async () => {
    messageHandlers = new Map()
    eventHandlers = new Map()
    publishCalls = []
    subscribeCalls = []
    unsubscribeCalls = []
    quitCalls = { redis: 0, subscriber: 0 }

    mockRedis = new MockRedis()
    mockSubscriber = new MockRedis()

    const originalPublish = mockRedis.publish.bind(mockRedis)
    mockRedis.publish = mock(async (channel: string, message: string) => {
      publishCalls.push({ channel, message })
      return originalPublish(channel, message)
    })

    const originalSubscribe = mockSubscriber.subscribe.bind(mockSubscriber)
    mockSubscriber.subscribe = mock(async (...channels: string[]) => {
      subscribeCalls.push(...channels)
      return originalSubscribe(...channels)
    })

    const originalUnsubscribe = mockSubscriber.unsubscribe.bind(mockSubscriber)
    mockSubscriber.unsubscribe = mock(async (...channels: string[]) => {
      unsubscribeCalls.push(...channels)
      return originalUnsubscribe(...channels)
    })

    const originalRedisQuit = mockRedis.quit.bind(mockRedis)
    mockRedis.quit = mock(async () => {
      quitCalls.redis++
      return originalRedisQuit()
    })

    const originalSubscriberQuit = mockSubscriber.quit.bind(mockSubscriber)
    mockSubscriber.quit = mock(async () => {
      quitCalls.subscriber++
      return originalSubscriberQuit()
    })

    const originalOn = mockSubscriber.on.bind(mockSubscriber)
    mockSubscriber.on = mock((event: string, handler: Function) => {
      if (!eventHandlers.has('subscriber')) {
        eventHandlers.set('subscriber', new Map())
      }
      eventHandlers.get('subscriber')?.set(event, handler)

      if (event === 'message') {
        messageHandlers.set('subscriber', handler as any)
      }

      return originalOn(event, handler)
    })

    let instanceCount = 0
    mock.module('ioredis', () => ({
      default: function Redis() {
        const instance = instanceCount++ === 0 ? mockRedis : mockSubscriber
        Object.setPrototypeOf(this, instance)
        return this
      },
    }))

    driver = new RedisDriver({
      host: 'localhost',
      port: 6379,
      keyPrefix: 'test:',
    })

    await driver.init()

    const connectHandler = eventHandlers.get('subscriber')?.get('connect')
    if (connectHandler) {
      connectHandler()
    }
  })

  afterEach(async () => {
    await driver.shutdown()
    messageHandlers.clear()
    eventHandlers.clear()
    publishCalls = []
    subscribeCalls = []
    unsubscribeCalls = []
  })

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(driver.isInitialized).toBe(true)
      const status = driver.getStatus()
      expect(status.initialized).toBe(true)
      expect(status.name).toBe('redis')
    })

    it('should not reinitialize if already initialized', async () => {
      const firstInit = driver.isInitialized
      await driver.init()
      expect(driver.isInitialized).toBe(firstInit)
    })

    it('should track connection status', () => {
      const status = driver.getStatus()
      expect(status.connected).toBe(true)
    })
  })

  describe('Pub/Sub Operations', () => {
    it('should publish messages to Redis channel', async () => {
      await driver.publish('test-channel', 'TestEvent', { message: 'hello' })

      expect(publishCalls).toHaveLength(1)
      expect(publishCalls[0].channel).toBe('test:test-channel')

      const parsed = JSON.parse(publishCalls[0].message)
      expect(parsed).toEqual({
        event: 'TestEvent',
        data: { message: 'hello' },
      })
    })

    it('should subscribe to Redis channel', async () => {
      const callback = mock(() => {})

      await driver.subscribe('test-channel', callback)

      expect(subscribeCalls).toContain('test:test-channel')
    })

    it('should receive messages on subscribed channels', async () => {
      const receivedMessages: Array<{ event: string; data: unknown }> = []
      const callback = mock((event: string, data: unknown) => {
        receivedMessages.push({ event, data })
      })

      await driver.subscribe('test-channel', callback)

      const messageHandler = messageHandlers.get('subscriber')
      expect(messageHandler).toBeDefined()

      const testMessage = JSON.stringify({
        event: 'TestEvent',
        data: { message: 'hello' },
      })

      messageHandler?.('test:test-channel', testMessage)

      expect(callback).toHaveBeenCalledWith('TestEvent', { message: 'hello' })
      expect(receivedMessages).toHaveLength(1)
      expect(receivedMessages[0]).toEqual({
        event: 'TestEvent',
        data: { message: 'hello' },
      })
    })

    it('should handle multiple subscribers to same channel', async () => {
      const callback1 = mock(() => {})
      const callback2 = mock(() => {})

      await driver.subscribe('shared-channel', callback1)
      await driver.subscribe('shared-channel', callback2)

      const messageHandler = messageHandlers.get('subscriber')!
      const testMessage = JSON.stringify({
        event: 'SharedEvent',
        data: { count: 42 },
      })

      messageHandler('test:shared-channel', testMessage)

      expect(callback1).toHaveBeenCalledWith('SharedEvent', { count: 42 })
      expect(callback2).toHaveBeenCalledWith('SharedEvent', { count: 42 })
    })

    it('should only subscribe to Redis once for multiple callbacks', async () => {
      const callback1 = mock(() => {})
      const callback2 = mock(() => {})

      await driver.subscribe('same-channel', callback1)
      const subsAfterFirst = subscribeCalls.filter((c) => c === 'test:same-channel').length

      await driver.subscribe('same-channel', callback2)
      const subsAfterSecond = subscribeCalls.filter((c) => c === 'test:same-channel').length

      expect(subsAfterSecond).toBe(subsAfterFirst)
    })

    it('should unsubscribe from Redis channel', async () => {
      const callback = mock(() => {})

      await driver.subscribe('temp-channel', callback)
      await driver.unsubscribe('temp-channel')

      expect(unsubscribeCalls).toContain('test:temp-channel')
    })
  })

  describe('Error Handling', () => {
    it('should throw error when publishing without initialization', async () => {
      const uninitializedDriver = new RedisDriver()

      await expect(uninitializedDriver.publish('channel', 'event', {})).rejects.toThrow(
        'RedisDriver not initialized'
      )
    })

    it('should throw error when subscribing without initialization', async () => {
      const uninitializedDriver = new RedisDriver()

      await expect(uninitializedDriver.subscribe('channel', () => {})).rejects.toThrow(
        'RedisDriver not initialized'
      )
    })

    it('should handle malformed messages gracefully', async () => {
      const callback = mock(() => {})
      await driver.subscribe('error-channel', callback)

      const messageHandler = messageHandlers.get('subscriber')!
      messageHandler('test:error-channel', 'invalid-json{')

      expect(callback).not.toHaveBeenCalled()

      const status = driver.getStatus()
      expect(status.lastError).toBeDefined()
    })

    it('should handle subscriber errors', () => {
      const errorHandler = eventHandlers.get('subscriber')?.get('error')
      expect(errorHandler).toBeDefined()

      const testError = new Error('Redis connection failed')
      errorHandler?.(testError)

      const status = driver.getStatus()
      expect(status.lastError).toContain('Redis connection failed')
    })

    it('should handle connection close', () => {
      const closeHandler = eventHandlers.get('subscriber')?.get('close')
      expect(closeHandler).toBeDefined()

      closeHandler?.()

      const status = driver.getStatus()
      expect(status.connected).toBe(false)
    })
  })

  describe('Shutdown', () => {
    it('should clear all subscriptions on shutdown', async () => {
      const callback1 = mock(() => {})
      const callback2 = mock(() => {})

      await driver.subscribe('channel-1', callback1)
      await driver.subscribe('channel-2', callback2)
      await driver.shutdown()

      const status = driver.getStatus()
      expect(status.initialized).toBe(false)
      expect(status.connected).toBe(false)
    })

    it('should quit both Redis connections on shutdown', async () => {
      await driver.shutdown()

      expect(quitCalls.redis).toBe(1)
      expect(quitCalls.subscriber).toBe(1)
    })

    it('should handle quit errors gracefully', async () => {
      mockRedis.quit = mock(async () => {
        throw new Error('Quit failed')
      })
      mockSubscriber.quit = mock(async () => {
        throw new Error('Quit failed')
      })

      await driver.shutdown()

      const status = driver.getStatus()
      expect(status.lastError).toBeDefined()
    })
  })

  describe('Multi-Subscriber Scenarios', () => {
    it('should deliver messages to all subscribers across different channels', async () => {
      const channel1Received: string[] = []
      const channel2Received: string[] = []

      await driver.subscribe('channel-1', (event) => {
        channel1Received.push(event)
      })

      await driver.subscribe('channel-2', (event) => {
        channel2Received.push(event)
      })

      const messageHandler = messageHandlers.get('subscriber')!

      messageHandler('test:channel-1', JSON.stringify({ event: 'Event1', data: {} }))

      messageHandler('test:channel-2', JSON.stringify({ event: 'Event2', data: {} }))

      expect(channel1Received).toEqual(['Event1'])
      expect(channel2Received).toEqual(['Event2'])
    })

    it('should not deliver messages to unsubscribed channels', async () => {
      const callback = mock(() => {})

      await driver.subscribe('active-channel', callback)

      const messageHandler = messageHandlers.get('subscriber')!

      messageHandler('test:inactive-channel', JSON.stringify({ event: 'IgnoredEvent', data: {} }))

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Configuration', () => {
    it('should initialize with custom key prefix', async () => {
      const customDriver = new RedisDriver({ keyPrefix: 'custom:' })
      await customDriver.init()

      expect(customDriver.isInitialized).toBe(true)
      const status = customDriver.getStatus()
      expect(status.name).toBe('redis')

      await customDriver.shutdown()
    })

    it('should initialize with default prefix', async () => {
      const defaultDriver = new RedisDriver()
      await defaultDriver.init()

      expect(defaultDriver.isInitialized).toBe(true)
      const status = defaultDriver.getStatus()
      expect(status.name).toBe('redis')

      await defaultDriver.shutdown()
    })
  })
})
