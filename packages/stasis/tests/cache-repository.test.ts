import { describe, expect, it } from 'bun:test'
import { CacheRepository } from '../src/CacheRepository'
import { MemoryStore } from '../src/stores/MemoryStore'

describe('CacheRepository', () => {
  it('handles basic get/set/has/missing and defaults', async () => {
    const repo = new CacheRepository(new MemoryStore(), { prefix: 'p:' })

    await repo.put('alpha', 'one', 60)
    expect(await repo.get('alpha')).toBe('one')
    expect(await repo.has('alpha')).toBe(true)
    expect(await repo.missing('beta')).toBe(true)

    expect(await repo.get('beta')).toBeNull()
    expect(await repo.get('beta', 'fallback')).toBe('fallback')
    expect(await repo.get('beta', () => 'fn')).toBe('fn')
  })

  it('supports add/forever/remember/rememberForever/many/putMany', async () => {
    const repo = new CacheRepository(new MemoryStore())

    await repo.put('exists', 'value', 60)
    expect(await repo.add('exists', 'next', 60)).toBe(false)
    expect(await repo.add('fresh', 'yes', 60)).toBe(true)

    await repo.forever('forever', 'value')
    expect(await repo.get('forever')).toBe('value')

    let calls = 0
    const first = await repo.remember('remember', 60, () => {
      calls += 1
      return 'saved'
    })
    const second = await repo.remember('remember', 60, () => {
      calls += 1
      return 'new'
    })
    expect(first).toBe('saved')
    expect(second).toBe('saved')
    expect(calls).toBe(1)

    await repo.rememberForever('remember-forever', () => 'ever')
    expect(await repo.get('remember-forever')).toBe('ever')

    await repo.putMany({ a: 1, b: 2 }, 60)
    const many = await repo.many(['a', 'b', 'missing'])
    expect(many).toEqual({ a: 1, b: 2, missing: null })
  })

  it('supports pull/forget/flush/increment/decrement', async () => {
    const repo = new CacheRepository(new MemoryStore())

    await repo.put('temp', 'value', 60)
    expect(await repo.pull('temp')).toBe('value')
    expect(await repo.get('temp')).toBeNull()

    await repo.put('count', 1, 60)
    expect(await repo.increment('count')).toBe(2)
    expect(await repo.decrement('count', 2)).toBe(0)

    await repo.put('to-forget', 'gone', 60)
    expect(await repo.forget('to-forget')).toBe(true)

    await repo.put('x', 1, 60)
    await repo.flush()
    expect(await repo.get('x')).toBeNull()
  })

  it('supports tags and tag flushing', async () => {
    const repo = new CacheRepository(new MemoryStore())
    const tagged = repo.tags(['red', 'blue'])

    await tagged.put('item', 'value', 60)
    expect(await tagged.get('item')).toBe('value')
    expect(await repo.get('item')).toBeNull()

    await tagged.increment('count')
    await tagged.flush()
    expect(await tagged.get('count')).toBeNull()
    await tagged.flush()
    expect(await tagged.get('item')).toBeNull()
  })

  it('supports flexible caching with stale refresh', async () => {
    const store = new MemoryStore()
    const repo = new CacheRepository(store)
    const key = 'flex'
    const metaKey = `__gravito:flexible:freshUntil:${key}`

    let calls = 0
    const first = await repo.flexible(key, 1, 5, () => {
      calls += 1
      return 'v1'
    })
    expect(first).toBe('v1')

    const second = await repo.flexible(key, 1, 5, () => {
      calls += 1
      return 'v2'
    })
    expect(second).toBe('v1')
    expect(calls).toBe(1)

    await store.put(metaKey, Date.now() - 500, 10)
    const stale = await repo.flexible(key, 1, 5, () => {
      calls += 1
      return 'v2'
    })
    expect(stale).toBe('v1')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(await repo.get(key)).toBe('v2')
    expect(calls).toBe(2)
  })

  it('emits events and reports errors safely', async () => {
    const errors: string[] = []
    const repo = new CacheRepository(new MemoryStore(), {
      eventsMode: 'sync',
      events: {
        write: () => {
          throw new Error('boom')
        },
      },
      onEventError: (error) => {
        errors.push((error as Error).message)
      },
    })

    await repo.put('key', 'value', 60)
    expect(errors).toEqual(['boom'])
  })

  it('can throw on event errors when configured', async () => {
    const repo = new CacheRepository(new MemoryStore(), {
      eventsMode: 'sync',
      throwOnEventError: true,
      events: {
        write: () => {
          throw new Error('boom')
        },
      },
    })

    await expect(repo.put('key', 'value', 60)).rejects.toThrow('boom')
  })

  it('emits async events without blocking and supports delete/clear/lock', async () => {
    const events: string[] = []
    const repo = new CacheRepository(new MemoryStore(), {
      events: {
        write: (key) => {
          events.push(`write:${key}`)
        },
        hit: (key) => {
          events.push(`hit:${key}`)
        },
      },
    })

    await repo.put('async', 'value', 60)
    await repo.get('async')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(events).toEqual(['write:async', 'hit:async'])

    await repo.delete('async')
    await repo.put('temp', 'value', 60)
    await repo.clear()
    expect(await repo.get('temp')).toBeNull()

    const lock = repo.lock('resource', 1)
    expect(lock).toBeDefined()
    await lock?.acquire()
    await lock?.release()
  })

  it('rejects tags for non-taggable stores', () => {
    const store = {
      get: async () => null,
      put: async () => {},
      add: async () => false,
      forget: async () => false,
      flush: async () => {},
      increment: async () => 0,
      decrement: async () => 0,
    } as any
    const repo = new CacheRepository(store)

    expect(() => repo.tags(['nope'])).toThrow('does not support tags')
  })

  it('handles async event errors in sync mode', async () => {
    const errors: string[] = []
    const repo = new CacheRepository(new MemoryStore(), {
      eventsMode: 'sync',
      events: {
        write: () => Promise.reject(new Error('async boom')),
      },
      onEventError: (error) => {
        errors.push((error as Error).message)
      },
    })

    await repo.put('key', 'value', 60)
    expect(errors).toEqual(['async boom'])
  })
})
