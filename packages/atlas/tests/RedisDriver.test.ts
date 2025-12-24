import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisDriver } from '../src/drivers/RedisDriver'

// Mock ioredis
const mockRedisClient = {
  connect: mock(() => Promise.resolve()),
  quit: mock(() => Promise.resolve()),
  status: 'ready',
  get: mock(() => Promise.resolve('value')),
  set: mock(() => Promise.resolve('OK')),
  setex: mock(() => Promise.resolve('OK')),
  del: mock(() => Promise.resolve(1)),
}

mock.module('ioredis', () => ({
  default: class {
    constructor() {
      Object.assign(this, mockRedisClient)
    }
  },
}))

describe('RedisDriver', () => {
  let driver: RedisDriver

  beforeEach(() => {
    driver = new RedisDriver({
      driver: 'redis',
      host: 'localhost',
      port: 6379,
    })
  })

  afterEach(async () => {
    await driver.disconnect()
  })

  it('should be defined', () => {
    expect(driver).toBeDefined()
  })

  it('should return correct driver name', () => {
    expect(driver.getDriverName()).toBe('redis')
  })

  it('should connect to redis', async () => {
    await driver.connect()
    expect(mockRedisClient.connect).toHaveBeenCalled()
  })

  it('should get value', async () => {
    const val = await driver.get('key')
    expect(val).toBe('value')
    expect(mockRedisClient.get).toHaveBeenCalledWith('key')
  })

  it('should set value', async () => {
    const res = await driver.set('key', 'value')
    expect(res).toBe('OK')
    expect(mockRedisClient.set).toHaveBeenCalledWith('key', 'value')
  })
})
