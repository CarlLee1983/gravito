import { describe, expect, test } from 'bun:test'
import { CacheRepository } from '../src/CacheRepository'
import { sleep } from '../src/locks'
import { MemoryStore } from '../src/stores/MemoryStore'

describe('Flexible Cache Timeouts', () => {
  test('clears refresh timeout after a successful background refresh', async () => {
    const originalSetTimeout = globalThis.setTimeout
    const originalClearTimeout = globalThis.clearTimeout
    const clearedTimers = new Set<ReturnType<typeof setTimeout>>()
    let createdTimeout: ReturnType<typeof setTimeout> | undefined

    globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
      const timer = originalSetTimeout(handler, timeout, ...args) as ReturnType<typeof setTimeout>
      createdTimeout = timer
      return Object.assign(timer, {
        unref() {
          return timer
        },
      })
    }) as unknown as typeof setTimeout

    globalThis.clearTimeout = ((timer?: ReturnType<typeof setTimeout>) => {
      if (timer) {
        clearedTimers.add(timer)
      }
      return originalClearTimeout(timer)
    }) as typeof clearTimeout

    try {
      const store = new MemoryStore()
      const cache = new CacheRepository(store, {
        refreshTimeout: 1000,
      })

      const key = 'test-timeout-clear'
      const fullKey = key
      const metaKey = `__gravito:flexible:freshUntil:${fullKey}`

      await store.put(fullKey, 'stale', 100)
      await store.put(metaKey, Date.now() - 100, 100)

      const result = await cache.flexible(key, 10, 10, async () => 'fresh')
      expect(result).toBe('stale')

      await sleep(20)

      expect(createdTimeout).toBeDefined()
      expect(clearedTimers.has(createdTimeout!)).toBe(true)
      expect(await cache.get<string>(key)).toBe('fresh')
    } finally {
      globalThis.setTimeout = originalSetTimeout
      globalThis.clearTimeout = originalClearTimeout
    }
  })
})
