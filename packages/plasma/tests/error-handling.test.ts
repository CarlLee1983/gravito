import { describe, expect, it, mock } from 'bun:test'
import { BunRedisClient } from '../src/clients/BunRedisClient'
import { RedisError } from '../src/errors'

// Mock Redis subclass for error testing
class TestErrorClient extends BunRedisClient {
  public mockInstance: any

  protected async getRedisClientClass(): Promise<any> {
    const self = this
    this.mockInstance = {
      connect: mock(async function (this: any) {
        this.connected = true
      }),
      close: mock(async function (this: any) {
        this.connected = false
      }),
      connected: false,
      set: mock(async () => 'OK'),
      send: mock(async (cmd: string) => {
        if (cmd === 'LPUSH') {
          throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value')
        }
        return 'OK'
      }),
      ping: mock(async () => 'PONG'),
    }
    return class {
      constructor() {
        Object.assign(this, self.mockInstance)
      }
    }
  }
}

describe('BunRedisClient Error Handling', () => {
  it('should wrap command errors in RedisError', async () => {
    const client = new TestErrorClient()
    await client.connect()

    try {
      // Act: Try to use list command (LPUSH -> sendCommand)
      await client.lpush('string_key', 'value')
    } catch (error) {
      // Assert
      expect(error).toBeInstanceOf(RedisError)
      expect((error as RedisError).command).toBe('LPUSH')
      expect((error as RedisError).message).toContain('WRONGTYPE')
    }
  })

  it('should wrap connection errors in RedisError', async () => {
    // We can test this by forcing handleException on a fake error
    const _client = new BunRedisClient({ host: 'localhost', port: 9999, maxRetries: 0 })
    // We don't call connect() here as it would timeout, instead we test the normalization logic
    // if we want to be 100% unit-testy.
    // However, the original test tried to connect to a bad port.
    // Let's use a very small timeout.
    const badClient = new BunRedisClient({
      host: 'localhost',
      port: 9999,
      maxRetries: 0,
      connectTimeout: 50,
    })

    try {
      await badClient.connect()
    } catch (error) {
      expect(error).toBeInstanceOf(RedisError)
      expect((error as RedisError).command).toBe('CONNECT')
    }
  })

  it('should pass health check when connected', async () => {
    const client = new TestErrorClient()
    await client.connect()
    const isHealthy = await client.checkHealth()
    expect(isHealthy).toBe(true)
  })

  it('should fail health check when disconnected', async () => {
    const client = new TestErrorClient()
    // Not connected
    expect(await client.checkHealth()).toBe(false)
  })

  it('should retry connection with backoff', async () => {
    const start = Date.now()
    // Test with very short times
    const badClient = new BunRedisClient({
      host: 'localhost',
      port: 9998,
      maxRetries: 1,
      retryDelay: 10,
      connectTimeout: 50,
    })

    try {
      await badClient.connect()
    } catch {
      // Expected to fail
    }
    const duration = Date.now() - start
    // 1 retry means at least one delay of 10ms + connectTimeout of 50ms
    expect(duration).toBeGreaterThan(50)
  })
})
