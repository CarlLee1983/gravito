import { describe, expect, it } from 'bun:test'
import { RateLimiter } from '../src/RateLimiter'
import { MemoryStore } from '../src/stores/MemoryStore'

describe('RateLimiter', () => {
  it('blocks when max attempts exceeded and can clear', async () => {
    const store = new MemoryStore()
    const limiter = new RateLimiter(store)

    await store.put('ip:2', 3, 60)
    const blocked = await limiter.attempt('ip:2', 2, 60)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)

    await limiter.clear('ip:2')
    const allowed = await limiter.attempt('ip:2', 1, 60)
    expect(allowed.allowed).toBe(true)
  })
})
