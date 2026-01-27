import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { ContentManager } from '../src/ContentManager'

describe('ContentManager Cache Invalidation', () => {
  it('should invalidate cache by key', async () => {
    const root = join(import.meta.dir, 'fixtures')
    const manager = new ContentManager(root)

    // @ts-expect-error - private access for testing
    manager.cache.set('docs:en:hello', { slug: 'hello' } as any)

    // @ts-expect-error - method not implemented yet
    manager.invalidate('docs', 'hello', 'en')

    // @ts-expect-error - private access
    expect(manager.cache.has('docs:en:hello')).toBe(false)
  })

  it('should clear all cache', async () => {
    const root = join(import.meta.dir, 'fixtures')
    const manager = new ContentManager(root)

    // @ts-expect-error - private access
    manager.cache.set('a', {} as any)
    // @ts-expect-error - private access
    manager.cache.set('b', {} as any)

    // @ts-expect-error - method not implemented yet
    manager.clearCache()

    // @ts-expect-error - private access
    expect(manager.cache.size).toBe(0)
  })
})
