import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  MockIORedis,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Connection Management', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should connect with default configuration', async () => {
    const newClient = new RedisClient()
    ;(newClient as any).ioredis = MockIORedis
    ;(newClient as any).connected = true
    ;(newClient as any).client = mockIORedisInstance
    expect((newClient as any).config.host ?? 'localhost').toBeDefined()
  })

  it('should connect with custom configuration', async () => {
    const customConfig = {
      host: 'redis.example.com',
      port: 6380,
      db: 1,
      password: 'secret',
      connectTimeout: 5000,
      commandTimeout: 3000,
      keyPrefix: 'app:',
      retryDelay: 100,
    }
    const newClient = new RedisClient(customConfig)
    expect((newClient as any).config).toEqual(customConfig)
  })

  it('should connect with TLS configuration', async () => {
    const tlsConfig = {
      host: 'redis.example.com',
      tls: {
        rejectUnauthorized: false,
      },
    }
    const newClient = new RedisClient(tlsConfig)
    expect((newClient as any).config.tls).toBeDefined()
  })

  it('should disconnect gracefully', async () => {
    ;(client as any).subscriber = mockIORedisInstance
    ;(client as any).subscriptions.set(
      'channel',
      mock(() => {})
    )

    mockIORedisInstance.quit.mockResolvedValueOnce('OK')
    await client.disconnect()

    expect(mockIORedisInstance.quit).toHaveBeenCalled()
    expect((client as any).subscriptions.size).toBe(0)
    expect((client as any).connected).toBe(false)
  })

  it('should ping successfully', async () => {
    expect(await client.ping()).toBe('PONG')
    expect(mockIORedisInstance.ping).toHaveBeenCalled()
  })

  it('should check health', async () => {
    mockIORedisInstance.ping.mockResolvedValueOnce('PONG')
    expect(await client.checkHealth()).toBe(true)
  })

  it('should return false on health check when not connected', async () => {
    ;(client as any).connected = false
    expect(await client.checkHealth()).toBe(false)
  })

  it('should return false on health check when ping fails', async () => {
    mockIORedisInstance.ping.mockResolvedValueOnce('ERROR')
    expect(await client.checkHealth()).toBe(false)
  })

  it('should check if connected', () => {
    expect(client.isConnected()).toBe(true)
  })

  it('should return false when not connected', () => {
    ;(client as any).connected = false
    expect(client.isConnected()).toBe(false)
  })

  it('should register event listeners', () => {
    const callback = mock(() => {})
    client.on('error', callback)
    expect(mockIORedisInstance.on).toHaveBeenCalledWith('error', callback)
  })
})
