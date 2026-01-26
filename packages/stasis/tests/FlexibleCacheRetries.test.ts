import { describe, expect, mock, test } from 'bun:test'
import { CacheRepository } from '../src/CacheRepository'
import { sleep } from '../src/locks'
import { MemoryStore } from '../src/stores/MemoryStore'

describe('Flexible Cache Retries', () => {
  test('retries on failure and succeeds', async () => {
    const store = new MemoryStore()
    const cache = new CacheRepository(store, {
      maxRetries: 2,
      retryDelay: 10,
    })

    let attempts = 0
    const callback = mock(async () => {
      attempts++
      if (attempts < 3) {
        throw new Error('Temporary failure')
      }
      return 'success'
    })

    const key = 'test-retry'
    const fullKey = key
    const metaKey = `__gravito:flexible:freshUntil:${fullKey}`

    // Pre-populate stale data
    await store.put(fullKey, 'stale', 100)
    await store.put(metaKey, Date.now() - 1000, 100)

    // Call flexible. It should return 'stale' immediately, and trigger refresh in background.
    const result = await cache.flexible(key, 10, 10, callback)
    expect(result).toBe('stale')

    // Wait for background refresh (2 retries * 10ms + buffer)
    await sleep(100)

    expect(attempts).toBe(3) // 1st fail, 2nd fail, 3rd success
    expect(cache.getFlexibleStats().refreshCount).toBe(1)
    expect(cache.getFlexibleStats().refreshFailures).toBe(0)

    // Verify value updated
    const finalValue = await cache.get<string>(key)
    expect(finalValue).toBe('success')
  })

  test('exhausts retries and records failure', async () => {
    const store = new MemoryStore()
    const cache = new CacheRepository(store, {
      maxRetries: 1,
      retryDelay: 10,
    })

    const callback = mock(async () => {
      throw new Error('Permanent failure')
    })

    const key = 'test-fail'
    const fullKey = key
    const metaKey = `__gravito:flexible:freshUntil:${fullKey}`

    await store.put(fullKey, 'stale', 100)
    await store.put(metaKey, Date.now() - 1000, 100)

    await cache.flexible(key, 10, 10, callback)

    await sleep(100)

    expect(callback).toHaveBeenCalledTimes(2) // Initial + 1 retry
    expect(cache.getFlexibleStats().refreshCount).toBe(0)
    expect(cache.getFlexibleStats().refreshFailures).toBe(1)
  })
})
