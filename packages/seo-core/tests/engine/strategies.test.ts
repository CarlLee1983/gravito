import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { CachedStrategy } from '../../src/engine/strategies/CachedStrategy'
import { DynamicStrategy } from '../../src/engine/strategies/DynamicStrategy'
import { IncrementalStrategy } from '../../src/engine/strategies/IncrementalStrategy'
import type { SeoResolver } from '../../src/interfaces'

const TEST_DIR = join(import.meta.dir, '.tmp-strategy-test')

describe('Strategies', () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true })
    }
    await mkdir(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true })
    }
  })

  describe('DynamicStrategy', () => {
    it('should return empty array when no resolvers', async () => {
      const strategy = new DynamicStrategy({
        mode: 'dynamic',
        baseUrl: 'https://example.com',
        resolvers: [],
      })

      await strategy.init()
      const entries = await strategy.getEntries()

      expect(entries).toEqual([])
    })

    it('should fetch entries from all resolvers', async () => {
      const resolver1: SeoResolver = {
        name: 'static',
        fetch: () => [{ url: '/page1' }, { url: '/page2' }],
      }
      const resolver2: SeoResolver = {
        name: 'blog',
        fetch: async () => [{ url: '/blog/post1' }],
      }

      const strategy = new DynamicStrategy({
        mode: 'dynamic',
        baseUrl: 'https://example.com',
        resolvers: [resolver1, resolver2],
      })

      await strategy.init()
      const entries = await strategy.getEntries()

      expect(entries.length).toBe(3)
      expect(entries.map((e) => e.url)).toContain('/page1')
      expect(entries.map((e) => e.url)).toContain('/page2')
      expect(entries.map((e) => e.url)).toContain('/blog/post1')
    })

    it('should apply resolver-level defaults', async () => {
      const resolver: SeoResolver = {
        name: 'pages',
        fetch: () => [{ url: '/no-defaults' }, { url: '/has-priority', priority: 0.5 }],
        priority: 0.8,
        changefreq: 'weekly',
      }

      const strategy = new DynamicStrategy({
        mode: 'dynamic',
        baseUrl: 'https://example.com',
        resolvers: [resolver],
      })

      const entries = await strategy.getEntries()

      const noDefaults = entries.find((e) => e.url === '/no-defaults')
      expect(noDefaults?.priority).toBe(0.8)
      expect(noDefaults?.changefreq).toBe('weekly')

      const hasPriority = entries.find((e) => e.url === '/has-priority')
      expect(hasPriority?.priority).toBe(0.5) // Should keep its own
      expect(hasPriority?.changefreq).toBe('weekly')
    })

    it('should handle resolver errors gracefully', async () => {
      const goodResolver: SeoResolver = {
        name: 'good',
        fetch: () => [{ url: '/works' }],
      }
      const badResolver: SeoResolver = {
        name: 'bad',
        fetch: () => {
          throw new Error('Database connection failed')
        },
      }

      const strategy = new DynamicStrategy({
        mode: 'dynamic',
        baseUrl: 'https://example.com',
        resolvers: [goodResolver, badResolver],
      })

      const entries = await strategy.getEntries()

      // Should still get results from good resolver
      expect(entries.length).toBe(1)
      expect(entries[0]?.url).toBe('/works')
    })

    it('should warn on add/remove calls', async () => {
      const warnSpy = mock(() => {})
      console.warn = warnSpy

      const strategy = new DynamicStrategy({
        mode: 'dynamic',
        baseUrl: 'https://example.com',
        resolvers: [],
      })

      await strategy.add({ url: '/test' })
      await strategy.remove('/test')

      expect(warnSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('CachedStrategy', () => {
    it('should cache results from resolver', async () => {
      let callCount = 0
      const resolver: SeoResolver = {
        name: 'dynamic',
        fetch: () => {
          callCount++
          return [{ url: `/call-${callCount}` }]
        },
      }

      const strategy = new CachedStrategy({
        mode: 'cached',
        baseUrl: 'https://example.com',
        resolvers: [resolver],
        cache: { ttl: 60 },
      })

      await strategy.init()

      // First call
      const entries1 = await strategy.getEntries()
      expect(entries1[0]?.url).toBe('/call-1')

      // Second call should return cached
      const entries2 = await strategy.getEntries()
      expect(entries2[0]?.url).toBe('/call-1') // Same as before
      expect(callCount).toBe(1) // Fetched only once
    })

    it('should refetch after TTL expires', async () => {
      let callCount = 0
      const resolver: SeoResolver = {
        name: 'dynamic',
        fetch: () => {
          callCount++
          return [{ url: `/call-${callCount}` }]
        },
      }

      const strategy = new CachedStrategy({
        mode: 'cached',
        baseUrl: 'https://example.com',
        resolvers: [resolver],
        cache: { ttl: 0.1 }, // 100ms TTL
      })

      await strategy.init()

      const entries1 = await strategy.getEntries()
      expect(entries1[0]?.url).toBe('/call-1')

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150))

      const entries2 = await strategy.getEntries()
      expect(entries2[0]?.url).toBe('/call-2')
      expect(callCount).toBe(2)
    })

    it('should use default TTL of 3600 seconds', async () => {
      const strategy = new CachedStrategy({
        mode: 'cached',
        baseUrl: 'https://example.com',
        resolvers: [],
      })

      // This just tests that no error is thrown with missing cache config
      await strategy.init()
      const entries = await strategy.getEntries()
      expect(entries).toEqual([])
    })
  })

  describe('IncrementalStrategy', () => {
    it('should throw if incremental config is missing', () => {
      expect(() => {
        new IncrementalStrategy({
          mode: 'incremental',
          baseUrl: 'https://example.com',
          resolvers: [],
        })
      }).toThrow('Config missing "incremental" settings')
    })

    it('should initialize from resolvers when no snapshot exists', async () => {
      const resolver: SeoResolver = {
        name: 'initial',
        fetch: () => [{ url: '/from-resolver', priority: 0.8 }],
      }

      const strategy = new IncrementalStrategy({
        mode: 'incremental',
        baseUrl: 'https://example.com',
        resolvers: [resolver],
        incremental: { logDir: TEST_DIR },
      })

      await strategy.init()
      const entries = await strategy.getEntries()

      expect(entries.length).toBe(1)
      expect(entries[0]?.url).toBe('/from-resolver')
    })

    it('should support add() for new entries', async () => {
      const strategy = new IncrementalStrategy({
        mode: 'incremental',
        baseUrl: 'https://example.com',
        resolvers: [],
        incremental: { logDir: TEST_DIR },
      })

      await strategy.init()
      await strategy.add({ url: '/new-page', priority: 0.9 })

      const entries = await strategy.getEntries()
      expect(entries.length).toBe(1)
      expect(entries[0]?.url).toBe('/new-page')
      expect(entries[0]?.priority).toBe(0.9)
    })

    it('should support remove() for existing entries', async () => {
      const resolver: SeoResolver = {
        name: 'initial',
        fetch: () => [{ url: '/keep' }, { url: '/remove-me' }],
      }

      const strategy = new IncrementalStrategy({
        mode: 'incremental',
        baseUrl: 'https://example.com',
        resolvers: [resolver],
        incremental: { logDir: TEST_DIR },
      })

      await strategy.init()
      await strategy.remove('/remove-me')

      const entries = await strategy.getEntries()
      expect(entries.length).toBe(1)
      expect(entries[0]?.url).toBe('/keep')
    })

    it('should compact logs into snapshot', async () => {
      const strategy = new IncrementalStrategy({
        mode: 'incremental',
        baseUrl: 'https://example.com',
        resolvers: [],
        incremental: { logDir: TEST_DIR },
      })

      await strategy.init()

      // Add multiple entries
      await strategy.add({ url: '/a' })
      await strategy.add({ url: '/b' })
      await strategy.add({ url: '/c' })

      // Compact
      await strategy.compact()

      // Verify entries are still accessible
      const entries = await strategy.getEntries()
      expect(entries.length).toBe(3)

      // Log file should be deleted after compact
      const logPath = join(TEST_DIR, 'sitemap.ops.jsonl')
      expect(existsSync(logPath)).toBe(false)
    })

    it('should preserve data across multiple sessions', async () => {
      // Session 1: Add some entries
      const strategy1 = new IncrementalStrategy({
        mode: 'incremental',
        baseUrl: 'https://example.com',
        resolvers: [],
        incremental: { logDir: TEST_DIR },
      })

      await strategy1.init()
      await strategy1.add({ url: '/persistent' })
      await strategy1.compact() // Save to snapshot

      // Session 2: New instance should load from snapshot
      const strategy2 = new IncrementalStrategy({
        mode: 'incremental',
        baseUrl: 'https://example.com',
        resolvers: [],
        incremental: { logDir: TEST_DIR },
      })

      await strategy2.init()
      const entries = await strategy2.getEntries()

      expect(entries.length).toBe(1)
      expect(entries[0]?.url).toBe('/persistent')

      await strategy1.shutdown()
      await strategy2.shutdown()
    })

    it('should auto-compact on interval', async () => {
      const strategy = new IncrementalStrategy({
        mode: 'incremental',
        baseUrl: 'https://example.com',
        resolvers: [],
        incremental: {
          logDir: TEST_DIR,
          compactInterval: 50, // Fast interval for testing
        },
      })

      await strategy.init()

      // Add entry to log
      await strategy.add({ url: '/auto-compact' })

      // Verify it is in log file (not yet compacted)
      const logPath = join(TEST_DIR, 'sitemap.ops.jsonl')
      expect(existsSync(logPath)).toBe(true)

      // Wait for interval + some buffer
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Compact should have run -> log file deleted
      expect(existsSync(logPath)).toBe(false)

      // Data should still be there (in snapshot)
      const entries = await strategy.getEntries()
      expect(entries.length).toBe(1)
      expect(entries[0]?.url).toBe('/auto-compact')

      await strategy.shutdown()
    })
  })
})
