import { describe, expect, it } from 'bun:test'
import { MemoryStore } from '../src/stores/MemoryStore'

describe('MemoryStore Statistics', () => {
  it('tracks hits and misses', async () => {
    const store = new MemoryStore()

    // Initial state
    expect(store.getStats()).toEqual({
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      evictions: 0,
    })

    // Miss (empty)
    await store.get('key1')
    expect(store.getStats().misses).toBe(1)
    expect(store.getStats().hits).toBe(0)

    // Put
    await store.put('key1', 'value1', 60)
    expect(store.getStats().size).toBe(1)

    // Hit
    await store.get('key1')
    expect(store.getStats().hits).toBe(1)
    expect(store.getStats().hitRate).toBe(0.5) // 1 hit / 2 requests

    // Miss (expired)
    await store.put('key2', 'value2', -1) // Expired immediately
    await store.get('key2')
    expect(store.getStats().misses).toBe(2)
  })

  it('tracks evictions', async () => {
    const store = new MemoryStore({ maxItems: 2 })

    await store.put('k1', 'v1', 60)
    await store.put('k2', 'v2', 60)
    expect(store.getStats().size).toBe(2)
    expect(store.getStats().evictions).toBe(0)

    // Add 3rd item, should evict k1 (LRU)
    await store.put('k3', 'v3', 60)
    expect(store.getStats().size).toBe(2)
    expect(store.getStats().evictions).toBe(1)

    // Verify k1 is gone
    const k1 = await store.get('k1')
    expect(k1).toBeNull()
    expect(store.getStats().misses).toBe(1)
  })

  it('tracks evictions with tags', async () => {
    const store = new MemoryStore({ maxItems: 2 })

    // Add tagged items
    await store.put('k1', 'v1', 60)
    store.tagIndexAdd(['tag1'], 'k1')

    await store.put('k2', 'v2', 60)

    // Evict k1
    await store.put('k3', 'v3', 60)

    expect(store.getStats().evictions).toBe(1)

    await store.flushTags(['tag1'])
    const k3 = await store.get('k3')
    expect(k3).toBe('v3')
  })
})
