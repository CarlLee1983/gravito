import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  MockIORedis,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Pub/Sub', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should subscribe to channel', async () => {
    mockIORedisInstance.duplicate.mockReturnValueOnce({
      ...mockIORedisInstance,
      on: mock(() => {}),
      subscribe: mock(async () => {}),
    })
    const callback = mock(() => {})
    await client.subscribe('events', callback)
    expect(mockIORedisInstance.duplicate).toHaveBeenCalled()
  })

  it('should unsubscribe from channel', async () => {
    const subscriberMock = {
      ...mockIORedisInstance,
      unsubscribe: mock(async () => {}),
    }
    ;(client as any).subscriber = subscriberMock
    ;(client as any).subscriptions.set(
      'events',
      mock(() => {})
    )

    await client.unsubscribe('events')
    expect(subscriberMock.unsubscribe).toHaveBeenCalledWith('events')
  })

  it('should publish message to channel', async () => {
    mockIORedisInstance.publish.mockResolvedValueOnce(1)
    expect(await client.publish('events', 'message')).toBe(1)
    expect(mockIORedisInstance.publish).toHaveBeenCalledWith('events', 'message')
  })

  it('should handle multiple subscriptions', async () => {
    const subscriberMock = {
      ...mockIORedisInstance,
      on: mock(() => {}),
      subscribe: mock(async () => {}),
    }
    mockIORedisInstance.duplicate.mockReturnValueOnce(subscriberMock)

    const callback1 = mock(() => {})
    const callback2 = mock(() => {})

    await client.subscribe('channel1', callback1)
    await client.subscribe('channel2', callback2)

    expect((client as any).subscriptions.size).toBe(2)
  })
})
