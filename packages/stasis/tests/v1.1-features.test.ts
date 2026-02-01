import { describe, expect, it, vi } from 'vitest'
import { CacheRepository } from '../src/CacheRepository'
import { sleep } from '../src/locks'
import { MemoryStore } from '../src/stores/MemoryStore'

describe('Stasis v1.1 Features', () => {
  it('should coalesce concurrent remember calls', async () => {
    const store = new MemoryStore()
    const repository = new CacheRepository(store)
    const callback = vi.fn().mockImplementation(async () => {
      await sleep(100)
      return { data: 'ok' }
    })

    // Execute multiple simultaneous remember calls
    const [res1, res2, res3] = await Promise.all([
      repository.remember('single-flight', 10, callback),
      repository.remember('single-flight', 10, callback),
      repository.remember('single-flight', 10, callback),
    ])

    expect(res1).toEqual({ data: 'ok' })
    expect(res2).toEqual({ data: 'ok' })
    expect(res3).toEqual({ data: 'ok' })

    // Callback should only be executed ONCE
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should compress large values when enabled', async () => {
    const store = new MemoryStore()
    const repository = new CacheRepository(store, {
      compression: { enabled: true, minSize: 100 },
    })

    const largeValue = {
      content: 'a'.repeat(200),
      meta: 'some metadata',
    }

    await repository.put('compressed-key', largeValue, 60)

    // Check retrieved value
    const retrieved = await repository.get('compressed-key')
    expect(retrieved).toEqual(largeValue)

    // Verify raw storage (should have compression wrapper)
    const raw = await store.get<any>('compressed-key')
    expect(raw).toHaveProperty('__gravito_compressed', true)
    expect(raw).toHaveProperty('data')
  })

  it('should NOT compress small values even if enabled', async () => {
    const store = new MemoryStore()
    const repository = new CacheRepository(store, {
      compression: { enabled: true, minSize: 1000 },
    })

    const smallValue = { content: 'small' }
    await repository.put('small-key', smallValue, 60)

    const raw = await store.get<any>('small-key')
    expect(raw).not.toHaveProperty('__gravito_compressed')
    expect(raw).toEqual(smallValue)
  })
})
