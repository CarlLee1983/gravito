import { describe, expect, it, mock, spyOn } from 'bun:test'
import { CacheRepository } from '../src/CacheRepository'
import { sleep } from '../src/locks'
import { MemoryStore } from '../src/stores/MemoryStore'

describe('Flexible Cache', () => {
  it('serves stale content and refreshes in background', async () => {
    const store = new MemoryStore()
    const repo = new CacheRepository(store)
    const key = 'test:flexible:1'

    let calls = 0
    const callback = async () => {
      calls++
      return 'value1'
    }

    const val1 = await repo.flexible(key, 1, 5, callback)
    expect(val1).toBe('value1')
    expect(calls).toBe(1)

    await sleep(1100)

    const callback2 = async () => {
      await sleep(100)
      calls++
      return 'value2'
    }

    const val2 = await repo.flexible(key, 1, 5, callback2)
    expect(val2).toBe('value1')

    await sleep(200)

    const val3 = await repo.get(key)
    expect(val3).toBe('value2')
    expect(calls).toBe(2)

    const stats = repo.getFlexibleStats()
    expect(stats.refreshCount).toBe(1)
  })

  it('prevents concurrent refreshes with semaphore', async () => {
    const store = new MemoryStore()
    const repo = new CacheRepository(store)
    const key = 'test:flexible:semaphore'

    await repo.put(key, 'initial', 1)
    const metaKey = `__gravito:flexible:freshUntil:${key}`
    await store.put(metaKey, Date.now() - 1000, 10)

    let calls = 0
    const callback = async () => {
      await sleep(100)
      calls++
      return 'refreshed'
    }

    await Promise.all([
      repo.flexible(key, 1, 5, callback),
      repo.flexible(key, 1, 5, callback),
      repo.flexible(key, 1, 5, callback),
    ])

    await sleep(200)

    expect(calls).toBe(1)

    const stats = repo.getFlexibleStats()
    expect(stats.refreshCount).toBe(1)
  })

  it('handles refresh timeout', async () => {
    const store = new MemoryStore()
    const repo = new CacheRepository(store, { refreshTimeout: 50 })
    const key = 'test:flexible:timeout'

    await repo.put(key, 'initial', 1)
    const metaKey = `__gravito:flexible:freshUntil:${key}`
    await store.put(metaKey, Date.now() - 1000, 10)

    const callback = async () => {
      await sleep(200)
      return 'slow'
    }

    await repo.flexible(key, 1, 5, callback)

    await sleep(300)

    const stats = repo.getFlexibleStats()
    expect(stats.refreshFailures).toBe(1)

    const val = await repo.get(key)
    expect(val).toBe('initial')
  })
})
