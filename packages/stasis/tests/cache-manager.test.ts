import { describe, expect, it } from 'bun:test'
import { CacheManager } from '../src/CacheManager'
import { MemoryStore } from '../src/stores/MemoryStore'

describe('CacheManager', () => {
  it('creates repositories with config and caches instances', async () => {
    const created: string[] = []
    const manager = new CacheManager(
      (name) => {
        created.push(name)
        return new MemoryStore()
      },
      { default: 'memory', prefix: 'p:', defaultTtl: 60 }
    )

    const first = manager.store()
    const second = manager.store()
    expect(first).toBe(second)
    expect(created).toEqual(['memory'])

    await manager.put('alpha', 'one', 60)
    expect(await manager.get('alpha')).toBe('one')
  })

  it('exposes limiter helper', async () => {
    const manager = new CacheManager(() => new MemoryStore())
    const limiter = manager.limiter()

    const first = await limiter.attempt('ip:1', 2, 60)
    const second = await limiter.attempt('ip:1', 2, 60)
    const third = await limiter.attempt('ip:1', 2, 60)

    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(true)
    expect(third.allowed).toBe(false)
  })

  it('propagates events to repositories', async () => {
    const events: string[] = []
    const manager = new CacheManager(
      () => new MemoryStore(),
      {},
      {
        write: (key) => {
          events.push(`write:${key}`)
        },
      },
      { mode: 'sync' }
    )

    await manager.put('event', 'value', 60)
    expect(events).toEqual(['write:event'])
  })

  it('proxies cache operations to the default store', async () => {
    const manager = new CacheManager(() => new MemoryStore())

    await manager.set('set', 'value', 60)
    expect(await manager.has('set')).toBe(true)
    expect(await manager.missing('missing')).toBe(true)

    await manager.add('add', 'value', 60)
    await manager.forever('forever', 'value')
    expect(await manager.get('forever')).toBe('value')

    let calls = 0
    await manager.remember('remember', 60, () => {
      calls += 1
      return 'value'
    })
    await manager.rememberForever('remember-forever', () => 'value')
    expect(calls).toBe(1)

    await manager.putMany({ a: 1, b: 2 }, 60)
    expect(await manager.many(['a', 'b', 'c'])).toEqual({ a: 1, b: 2, c: null })

    await manager.flexible('flex', 1, 1, () => 'value')
    await manager.pull('a')
    await manager.forget('b')
    await manager.delete('set')

    await manager.increment('counter', 2)
    await manager.decrement('counter', 1)

    const lock = manager.lock('lock', 1)
    await lock?.acquire()
    await lock?.release()

    const tagged = manager.tags(['group'])
    await tagged.put('tagged', 'value', 60)
    await tagged.flush()

    await manager.clear()
  })
})
