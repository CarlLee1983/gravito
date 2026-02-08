import { beforeEach, describe, expect, it } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - String Operations', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should get a value', async () => {
    mockIORedisInstance.get.mockResolvedValueOnce('myvalue')
    expect(await client.get('mykey')).toBe('myvalue')
    expect(mockIORedisInstance.get).toHaveBeenCalledWith('mykey')
  })

  it('should return null when key does not exist', async () => {
    mockIORedisInstance.get.mockResolvedValueOnce(null)
    expect(await client.get('nonexistent')).toBeNull()
  })

  it('should set a value with basic options', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    expect(await client.set('key', 'value')).toBe('OK')
  })

  it('should set with EX option', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.set('key', 'value', { ex: 60 })
    expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'EX', 60)
  })

  it('should set with PX option', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.set('key', 'value', { px: 60000 })
    expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'PX', 60000)
  })

  it('should set with NX option', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.set('key', 'value', { nx: true })
    expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'NX')
  })

  it('should set with XX option', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.set('key', 'value', { xx: true })
    expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'XX')
  })

  it('should set with KEEPTTL option', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.set('key', 'value', { keepttl: true })
    expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'KEEPTTL')
  })

  it('should set with multiple options', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.set('key', 'value', { ex: 60, nx: true })
    expect(mockIORedisInstance.call).toHaveBeenCalledWith('SET', 'key', 'value', 'EX', 60, 'NX')
  })

  it('should return null when SET condition not met', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce(null)
    expect(await client.set('key', 'value', { nx: true })).toBeNull()
  })

  it('should delete keys', async () => {
    mockIORedisInstance.del.mockResolvedValueOnce(2)
    expect(await client.del('key1', 'key2')).toBe(2)
    expect(mockIORedisInstance.del).toHaveBeenCalledWith('key1', 'key2')
  })

  it('should check key existence', async () => {
    mockIORedisInstance.exists.mockResolvedValueOnce(2)
    expect(await client.exists('key1', 'key2')).toBe(2)
    expect(mockIORedisInstance.exists).toHaveBeenCalledWith('key1', 'key2')
  })

  it('should increment a key', async () => {
    mockIORedisInstance.incr.mockResolvedValueOnce(2)
    expect(await client.incr('counter')).toBe(2)
    expect(mockIORedisInstance.incr).toHaveBeenCalledWith('counter')
  })

  it('should increment by amount', async () => {
    mockIORedisInstance.incrby.mockResolvedValueOnce(15)
    expect(await client.incrby('counter', 10)).toBe(15)
    expect(mockIORedisInstance.incrby).toHaveBeenCalledWith('counter', 10)
  })

  it('should decrement a key', async () => {
    mockIORedisInstance.decr.mockResolvedValueOnce(0)
    expect(await client.decr('counter')).toBe(0)
    expect(mockIORedisInstance.decr).toHaveBeenCalledWith('counter')
  })

  it('should decrement by amount', async () => {
    mockIORedisInstance.decrby.mockResolvedValueOnce(5)
    expect(await client.decrby('counter', 5)).toBe(5)
    expect(mockIORedisInstance.decrby).toHaveBeenCalledWith('counter', 5)
  })

  it('should append to a value', async () => {
    mockIORedisInstance.append.mockResolvedValueOnce(10)
    expect(await client.append('key', 'extra')).toBe(10)
    expect(mockIORedisInstance.append).toHaveBeenCalledWith('key', 'extra')
  })

  it('should get string length', async () => {
    mockIORedisInstance.strlen.mockResolvedValueOnce(5)
    expect(await client.strlen('key')).toBe(5)
    expect(mockIORedisInstance.strlen).toHaveBeenCalledWith('key')
  })

  it('should get and set value atomically', async () => {
    mockIORedisInstance.getset.mockResolvedValueOnce('old')
    expect(await client.getset('key', 'new')).toBe('old')
    expect(mockIORedisInstance.getset).toHaveBeenCalledWith('key', 'new')
  })

  it('should get multiple values', async () => {
    mockIORedisInstance.mget.mockResolvedValueOnce(['v1', 'v2', null])
    expect(await client.mget('k1', 'k2', 'k3')).toEqual(['v1', 'v2', null])
    expect(mockIORedisInstance.mget).toHaveBeenCalledWith('k1', 'k2', 'k3')
  })

  it('should set multiple values', async () => {
    mockIORedisInstance.mset.mockResolvedValueOnce('OK')
    expect(await client.mset({ k1: 'v1', k2: 'v2' })).toBe('OK')
    expect(mockIORedisInstance.mset).toHaveBeenCalled()
  })
})
