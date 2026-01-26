import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test'
import { RedisDriver } from '../src/drivers/RedisDriver'
import { MockRedis } from './mock-redis'

describe('RedisDriver', () => {
  let driver: RedisDriver
  let pubClient: any
  let subClient: any

  beforeEach(async () => {
    pubClient = new MockRedis()
    subClient = new MockRedis()

    driver = new RedisDriver({
      host: 'localhost',
      port: 6379,
    })

    ;(driver as any).redis = pubClient
    ;(driver as any).subscriber = subClient
    ;(driver as any)._initialized = true
    ;(driver as any)._connected = true

    driver.init = async () => {}
  })

  afterEach(async () => {
    await driver.shutdown()
  })

  it('should initialize and shutdown successfully', async () => {
    expect(driver).toBeDefined()
  })

  it('should publish and receive messages', async () => {
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

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('ripple:channel-1')
  })

  it('should support channel prefix', async () => {
    driver = new RedisDriver({
      keyPrefix: 'custom:',
    })
    ;(driver as any).redis = pubClient
    ;(driver as any).subscriber = subClient
    ;(driver as any)._initialized = true
    ;(driver as any)._connected = true
    driver.init = async () => {}

    const spy = spyOn(pubClient, 'publish')
    await driver.publish('channel', 'evt', 1)

    expect(spy).toHaveBeenCalledWith('custom:channel', JSON.stringify({ event: 'evt', data: 1 }))
  })

  it('should handle unsubscribe', async () => {
    const spy = spyOn(subClient, 'unsubscribe')
    const handler = () => {}

    await driver.subscribe('channel-2', handler)
    await driver.unsubscribe('channel-2')

    expect(spy).toHaveBeenCalledWith('ripple:channel-2')
  })

  it('should throw error if publish before init', async () => {
    const newDriver = new RedisDriver()
    expect(newDriver.publish('test', 'event', {})).rejects.toThrow()
  })

  it('should throw error if subscribe before init', async () => {
    const newDriver = new RedisDriver()
    expect(newDriver.subscribe('test', () => {})).rejects.toThrow()
  })
})

function spyOn(obj: any, method: string) {
  const original = obj[method]
  const mockFn = jest.fn(original)
  obj[method] = mockFn
  return mockFn
}
