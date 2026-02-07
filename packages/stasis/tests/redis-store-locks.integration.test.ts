import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Redis } from '@gravito/plasma'
import { LockTimeoutError, sleep } from '../src/locks'
import { RedisStore } from '../src/stores/RedisStore'

async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = Redis.connection('locks-test-probe')
    await client.connect()
    await Redis.removeConnection('locks-test-probe')
    return true
  } catch {
    return false
  }
}

describe('RedisStore Distributed Lock Atomicity', () => {
  let redisAvailable = false

  beforeAll(async () => {
    Redis.configure({
      connections: {
        'locks-test': {
          host: 'localhost',
          port: 6379,
          db: 14,
          maxRetries: 0,
          connectTimeout: 500,
        },
        'locks-test-probe': {
          host: 'localhost',
          port: 6379,
          db: 14,
          maxRetries: 0,
          connectTimeout: 500,
        },
      },
    })

    redisAvailable = await isRedisAvailable()
    if (!redisAvailable) {
      return
    }

    const client = Redis.connection('locks-test')
    await client.connect()
    await client.flushdb()
  })

  afterAll(async () => {
    if (redisAvailable) {
      await Redis.removeConnection('locks-test')
    }
  })

  it('should acquire and release lock correctly', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'locks-test' })
    const lock = store.lock('resource:1', 5)

    expect(await lock.acquire()).toBe(true)
    expect(await lock.acquire()).toBe(false)

    await lock.release()

    const lock2 = store.lock('resource:1', 5)
    expect(await lock2.acquire()).toBe(true)
  })

  it('should not release another owners lock (race condition fix)', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'locks-test' })

    const lockA = store.lock('shared-resource', 1) // 1 second TTL for reliability
    const lockB = store.lock('shared-resource', 5)

    expect(await lockA.acquire()).toBe(true)

    // Check lock exists and has TTL set
    const client = Redis.connection('locks-test')
    const ttlAfterAcquire = await client.ttl('lock:shared-resource')
    expect(ttlAfterAcquire).toBeGreaterThan(0)

    await sleep(1500) // Wait for lockA to expire

    const lockAfterExpiry = await client.get('lock:shared-resource')
    expect(lockAfterExpiry).toBeNull()

    expect(await lockB.acquire()).toBe(true)

    await lockA.release()

    const lockValue = await client.get('lock:shared-resource')
    expect(lockValue).not.toBeNull()

    await lockB.release()

    const lockValueAfter = await client.get('lock:shared-resource')
    expect(lockValueAfter).toBeNull()
  })

  it('should extend lock TTL only if owner matches', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'locks-test' })

    const lock1 = store.lock('extendable', 1)
    const lock2 = store.lock('extendable', 1)

    expect(await lock1.acquire()).toBe(true)

    const client = Redis.connection('locks-test')
    if (lock1.extend) {
      const extended = await lock1.extend(10)
      expect(extended).toBe(true)

      const ttl = await client.ttl('lock:extendable')
      expect(ttl).toBeGreaterThan(5)
      expect(ttl).toBeLessThanOrEqual(10)
    }

    if (lock2.extend) {
      const extendFailed = await lock2.extend(10)
      expect(extendFailed).toBe(false)
    }

    await lock1.release()
  })

  it('should get remaining time for lock', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'locks-test' })

    const lock = store.lock('timed-resource', 5)
    expect(await lock.acquire()).toBe(true)

    if (lock.getRemainingTime) {
      const ttl = await lock.getRemainingTime()
      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(5)
    }

    await lock.release()

    if (lock.getRemainingTime) {
      const ttlAfter = await lock.getRemainingTime()
      expect(ttlAfter).toBe(-2)
    }
  })

  it('should support block with retryInterval and maxRetries', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'locks-test' })

    const lock1 = store.lock('blocking-resource', 2)
    await lock1.acquire()

    const lock2 = store.lock('blocking-resource', 2)

    let attempts = 0
    const originalAcquire = lock2.acquire.bind(lock2)
    lock2.acquire = async () => {
      attempts++
      return originalAcquire()
    }

    await expect(
      lock2.block(0.5, () => 'success', {
        retryInterval: 50,
        maxRetries: 5,
      })
    ).rejects.toThrow(LockTimeoutError)

    expect(attempts).toBeLessThanOrEqual(5)

    await lock1.release()
  })

  it('should support block with AbortSignal', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'locks-test' })

    const lock1 = store.lock('abortable-resource', 10)
    await lock1.acquire()

    const lock2 = store.lock('abortable-resource', 10)

    const controller = new AbortController()

    setTimeout(() => controller.abort(), 100)

    await expect(
      lock2.block(5, () => 'success', {
        signal: controller.signal,
        retryInterval: 50,
      })
    ).rejects.toThrow('aborted')

    await lock1.release()
  })

  it('should use exponential backoff in block method', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'locks-test' })

    const lock1 = store.lock('backoff-resource', 1)
    await lock1.acquire()

    const lock2 = store.lock('backoff-resource', 1)

    const timestamps: number[] = []
    const originalAcquire = lock2.acquire.bind(lock2)
    lock2.acquire = async () => {
      timestamps.push(Date.now())
      return originalAcquire()
    }

    setTimeout(async () => {
      await lock1.release()
    }, 300)

    await lock2.block(1, () => 'success', { retryInterval: 50 })

    for (let i = 1; i < timestamps.length && i < 3; i++) {
      const delay = timestamps[i] - timestamps[i - 1]
      const expectedMinDelay = 50 * 1.5 ** (i - 1)
      expect(delay).toBeGreaterThanOrEqual(expectedMinDelay * 0.8)
    }
  })

  it('should execute callback and release lock on success', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'locks-test' })

    const lock = store.lock('callback-resource', 5)

    const result = await lock.block(1, async () => {
      await sleep(10)
      return 'task completed'
    })

    expect(result).toBe('task completed')

    const client = Redis.connection('locks-test')
    const lockValue = await client.get('lock:callback-resource')
    expect(lockValue).toBeNull()
  })

  it('should release lock even if callback throws', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'locks-test' })

    const lock = store.lock('error-resource', 5)

    await expect(
      lock.block(1, async () => {
        throw new Error('callback failed')
      })
    ).rejects.toThrow('callback failed')

    const client = Redis.connection('locks-test')
    const lockValue = await client.get('lock:error-resource')
    expect(lockValue).toBeNull()
  })

  it('should handle concurrent lock acquisitions correctly', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'locks-test' })

    let sharedCounter = 0
    const increment = async () => {
      const lock = store.lock('concurrent-resource', 1)
      await lock.block(2, async () => {
        const current = sharedCounter
        await sleep(10)
        sharedCounter = current + 1
      })
    }

    await Promise.all([increment(), increment(), increment(), increment(), increment()])

    expect(sharedCounter).toBe(5)
  })
})
