import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { BunRedisClient } from '../src/clients/BunRedisClient'
import { RedisError } from '../src/errors'

describe('BunRedisClient Error Handling', () => {
  const config = {
    host: 'localhost',
    port: 6379,
  }

  let client: BunRedisClient

  beforeAll(async () => {
    client = new BunRedisClient(config)
    await client.connect()
  })

  afterAll(async () => {
    await client.disconnect()
  })

  it('should wrap command errors in RedisError', async () => {
    // Setup: Set a key as string
    await client.set('string_key', 'value')

    try {
      // Act: Try to use list command on string key (should fail)
      await client.lpush('string_key', 'value')
    } catch (error) {
      // Assert
      expect(error).toBeInstanceOf(RedisError)
      expect((error as RedisError).command).toBe('LPUSH') // LPUSH calls sendCommand with command name
      expect((error as RedisError).message).toContain('WRONGTYPE')
    }
  })

  it('should wrap connection errors in RedisError', async () => {
    const badClient = new BunRedisClient({
      ...config,
      port: 9999,
      maxRetries: 0,
      connectTimeout: 100,
    }) // Invalid port
    try {
      await badClient.connect()
    } catch (error) {
      expect(error).toBeInstanceOf(RedisError)
      expect((error as RedisError).command).toBe('CONNECT')
    }
  })

  it('should pass health check when connected', async () => {
    const isHealthy = await client.checkHealth()
    expect(isHealthy).toBe(true)
  })

  it('should fail health check when disconnected', async () => {
    const tempClient = new BunRedisClient(config)
    expect(await tempClient.checkHealth()).toBe(false)
  })

  // To test backoff, we can try a port that doesn't exist and ensure it retries at least once (taking > 100ms)
  // but fails eventually.
  it('should retry connection with backoff', async () => {
    const start = Date.now()
    const badClient = new BunRedisClient({
      ...config,
      port: 9998,
      maxRetries: 2,
      retryDelay: 50,
      connectTimeout: 100,
    })

    try {
      await badClient.connect()
    } catch {
      // Expected to fail
    }
    const duration = Date.now() - start
    // 2 retries:
    // 0: wait
    // 1: wait 50ms
    // 2: wait 100ms
    // Total wait approx 150ms + overhead
    expect(duration).toBeGreaterThan(100)
  })
})
