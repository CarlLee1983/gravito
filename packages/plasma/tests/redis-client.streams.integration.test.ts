import { beforeEach, describe, expect, it } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Stream Operations (Phase 3)', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should get stream length', async () => {
    mockIORedisInstance.xlen.mockResolvedValueOnce(5)
    expect(await client.xlen('mystream')).toBe(5)
    expect(mockIORedisInstance.xlen).toHaveBeenCalledWith('mystream')
  })

  it('should add entry to stream', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('1526919030474-0')
    const result = await client.xadd('mystream', { field1: 'value1' })
    expect(result).toBe('1526919030474-0')
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should add entry to stream with max length', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('1526919030475-0')
    await client.xadd('mystream', { field1: 'value1' }, { maxlen: 1000 })
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should add entry to stream with approximate maxlen', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('1526919030476-0')
    await client.xadd('mystream', { field1: 'value1' }, { maxlen: 1000, approximate: true })
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should add entry to stream with specific ID', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('1526919030477-0')
    await client.xadd('mystream', { field1: 'value1' }, { id: '1526919030477-0' })
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should read from stream', async () => {
    const streamData = [['mystream', [['1526919030474-0', ['field1', 'value1']]]]]
    mockIORedisInstance.call.mockResolvedValueOnce(streamData)
    const result = await client.xread({ mystream: '0' })
    expect(result).toEqual(streamData)
  })

  it('should read from stream with COUNT', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce([['mystream', []]])
    await client.xread({ mystream: '0' }, { count: 10 })
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should read from stream with BLOCK', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce(null)
    await client.xread({ mystream: '0' }, { block: 1000 })
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should read from stream as consumer group', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce([['mystream', []]])
    await client.xreadgroup('workers', 'consumer-1', { mystream: '>' })
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should create consumer group', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.xgroup('CREATE', 'mystream', 'workers', '$')
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should create consumer group with MKSTREAM', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.xgroup('CREATE', 'mystream', 'workers', '$', true)
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should destroy consumer group', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce(1)
    await client.xgroup('DESTROY', 'mystream', 'workers')
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should delete consumer from group', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce(0)
    await client.xgroup('DELCONSUMER', 'mystream', 'workers', 'consumer-1')
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should set group ID', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.xgroup('SETID', 'mystream', 'workers', '$')
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should acknowledge message in stream', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce(1)
    expect(await client.xack('mystream', 'workers', '1526919030474-0')).toBe(1)
    expect(mockIORedisInstance.call).toHaveBeenCalledWith(
      'XACK',
      'mystream',
      'workers',
      '1526919030474-0'
    )
  })

  it('should get stream range', async () => {
    mockIORedisInstance.xrange.mockResolvedValueOnce([['1526919030474-0', ['field1', 'value1']]])
    const result = await client.xrange('mystream', '-', '+')
    expect(result).toBeDefined()
    expect(mockIORedisInstance.xrange).toHaveBeenCalledWith('mystream', '-', '+')
  })

  it('should get stream range with count', async () => {
    mockIORedisInstance.xrange.mockResolvedValueOnce([])
    await client.xrange('mystream', '-', '+', 10)
    expect(mockIORedisInstance.xrange).toHaveBeenCalledWith('mystream', '-', '+', 'COUNT', 10)
  })

  it('should get reverse stream range', async () => {
    mockIORedisInstance.xrevrange.mockResolvedValueOnce([])
    await client.xrevrange('mystream', '+', '-')
    expect(mockIORedisInstance.xrevrange).toHaveBeenCalledWith('mystream', '+', '-')
  })

  it('should trim stream', async () => {
    mockIORedisInstance.xtrim.mockResolvedValueOnce(0)
    expect(await client.xtrim('mystream', 1000)).toBe(0)
    expect(mockIORedisInstance.xtrim).toHaveBeenCalledWith('mystream', 'MAXLEN', 1000)
  })

  it('should trim stream with approximate', async () => {
    mockIORedisInstance.xtrim.mockResolvedValueOnce(0)
    await client.xtrim('mystream', 1000, true)
    expect(mockIORedisInstance.xtrim).toHaveBeenCalledWith('mystream', 'MAXLEN', '~', 1000)
  })

  it('should delete entry from stream', async () => {
    mockIORedisInstance.xdel.mockResolvedValueOnce(1)
    expect(await client.xdel('mystream', '1526919030474-0')).toBe(1)
    expect(mockIORedisInstance.xdel).toHaveBeenCalledWith('mystream', '1526919030474-0')
  })

  it('should delete multiple entries from stream', async () => {
    mockIORedisInstance.xdel.mockResolvedValueOnce(2)
    await client.xdel('mystream', '1526919030474-0', '1526919030475-0')
    expect(mockIORedisInstance.xdel).toHaveBeenCalledWith(
      'mystream',
      '1526919030474-0',
      '1526919030475-0'
    )
  })
})
