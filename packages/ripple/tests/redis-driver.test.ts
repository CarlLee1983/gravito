import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test'
import { RedisDriver } from '../src/drivers/RedisDriver'
import { MockRedis } from './mock-redis'

describe('RedisDriver', () => {
  let driver: RedisDriver
  let pubClient: any
  let subClient: any

  beforeEach(async () => {
    // Manually inject mocks
    pubClient = new MockRedis()
    subClient = new MockRedis()

    driver = new RedisDriver({
      driver: 'redis',
      host: 'localhost',
      port: 6379,
    })

    // Inject mocks directly into private properties
    // biome-ignore lint/suspicious/noExplicitAny: Accessing private properties for testing
    ;(driver as any).redis = pubClient
    // biome-ignore lint/suspicious/noExplicitAny: Accessing private properties for testing
    ;(driver as any).subscriber = subClient

    // Override init to do nothing (since we already injected connected clients)
    driver.init = async () => {}
  })

  afterEach(async () => {
    await driver.shutdown()
  })

  it('should initialize and shutdown successfully', async () => {
    // Already connected in beforeEach
    expect(driver).toBeDefined()
  })

  it('should publish and receive messages', async () => {
    // For this test with mocks, we verify methods are called
    const spy = spyOn(pubClient, 'publish')
    await driver.publish('test-channel', 'test', 123)
    expect(spy).toHaveBeenCalled()
    expect(spy.mock.calls[0]).toEqual([
      'ripple:test-channel',
      JSON.stringify({ event: 'test', data: 123 }),
    ])
  })

  it('should handle multiple subscribers to the same channel', async () => {
    const spy = spyOn(subClient, 'subscribe')
    const handler1 = () => {}
    const handler2 = () => {}

    await driver.subscribe('channel-1', handler1)
    await driver.subscribe('channel-1', handler2)

    expect(spy).toHaveBeenCalledTimes(1) // Should subscribe only once per channel
    expect(spy).toHaveBeenCalledWith('ripple:channel-1')
  })

  it('should support channel prefix', async () => {
    driver = new RedisDriver({
      driver: 'redis',
      keyPrefix: 'custom:',
    })
    // Re-inject mocks
    // biome-ignore lint/suspicious/noExplicitAny: Accessing private properties for testing
    ;(driver as any).redis = pubClient
    // biome-ignore lint/suspicious/noExplicitAny: Accessing private properties for testing
    ;(driver as any).subscriber = subClient
    driver.init = async () => {}

    const spy = spyOn(pubClient, 'publish')
    await driver.publish('channel', 'evt', 1)

    expect(spy).toHaveBeenCalledWith('custom:channel', JSON.stringify({ event: 'evt', data: 1 }))
  })

  it('should handle unsubscribe', async () => {
    const spy = spyOn(subClient, 'unsubscribe')
    const handler = () => {}

    await driver.subscribe('channel-2', handler)
    await driver.unsubscribe('channel-2', handler)

    expect(spy).toHaveBeenCalledWith('ripple:channel-2')
  })

  it('should throw error if publish before init', async () => {
    const newDriver = new RedisDriver({ driver: 'redis' })
    // No connect() called
    expect(newDriver.publish('test', {})).rejects.toThrow()
  })

  it('should throw error if subscribe before init', async () => {
    const newDriver = new RedisDriver({ driver: 'redis' })
    expect(newDriver.subscribe('test', () => {})).rejects.toThrow()
  })
})

// Helper to spy on methods
function spyOn(obj: any, method: string) {
  const original = obj[method]
  const mockFn = jest.fn(original)
  obj[method] = mockFn
  return mockFn
}
