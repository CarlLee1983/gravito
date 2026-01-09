import { describe, expect, it } from 'bun:test'
import { LockTimeoutError, sleep } from '../src/locks'
import { MemoryStore } from '../src/stores/MemoryStore'

describe('MemoryStore', () => {
  it('handles ttl expiry and add semantics', async () => {
    const store = new MemoryStore()

    await store.put('immediate', 'value', 0)
    expect(await store.get('immediate')).toBeNull()

    await store.put('soon', 'value', 1)
    expect(await store.get('soon')).toBe('value')

    expect(await store.add('soon', 'next', 60)).toBe(false)
    expect(await store.add('fresh', 'ok', 60)).toBe(true)
    expect(await store.get('fresh')).toBe('ok')
  })

  it('supports increment/decrement and flush', async () => {
    const store = new MemoryStore()

    expect(await store.increment('count')).toBe(1)
    expect(await store.decrement('count')).toBe(0)

    await store.put('a', 1, 60)
    await store.flush()
    expect(await store.get('a')).toBeNull()
  })

  it('supports locks and block timeout', async () => {
    const store = new MemoryStore()

    const lock1 = store.lock('resource', 1)
    const lock2 = store.lock('resource', 1)

    expect(await lock1.acquire()).toBe(true)
    expect(await lock2.acquire()).toBe(false)

    await expect(lock2.block(0.01, () => 'never', { sleepMillis: 1 })).rejects.toThrow(
      LockTimeoutError
    )

    await lock1.release()
    const result = await lock2.block(0.1, () => 'ok')
    expect(result).toBe('ok')
  })

  it('supports tag keys and tag flushing', async () => {
    const store = new MemoryStore()
    const taggedKey = store.tagKey('item', ['a', 'b'])

    await store.put(taggedKey, 'value', 60)
    expect(await store.get(taggedKey)).toBe('value')

    store.tagIndexAdd(['a', 'b'], taggedKey)
    await store.flushTags(['a'])
    expect(await store.get(taggedKey)).toBeNull()
  })

  it('exposes sleep helper', async () => {
    const start = Date.now()
    await sleep(5)
    expect(Date.now() - start).toBeGreaterThanOrEqual(0)
  })
})
