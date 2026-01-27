import { describe, expect, it } from 'bun:test'
import { MemoryChangeTracker } from '../src/core/ChangeTracker'
import { IncrementalGenerator } from '../src/core/IncrementalGenerator'
import { SitemapParser } from '../src/core/SitemapParser'
import { MemorySitemapStorage } from '../src/storage/MemorySitemapStorage'

describe('IncrementalGenerator', () => {
  const baseUrl = 'https://example.com'

  it('should generate full sitemap and manifest', async () => {
    const storage = new MemorySitemapStorage(baseUrl)
    const tracker = new MemoryChangeTracker()
    const generator = new IncrementalGenerator({
      baseUrl,
      storage,
      changeTracker: tracker,
      providers: [
        {
          getEntries: () => [{ url: '/a' }, { url: '/b' }],
        },
      ],
      filename: 'sitemap.xml',
    })

    await generator.generateFull()

    expect(await storage.exists('sitemap.xml')).toBe(true)
    expect(await storage.exists('sitemap-manifest.json')).toBe(true)

    const manifest = JSON.parse((await storage.read('sitemap-manifest.json'))!)
    expect(manifest.shards).toHaveLength(1)
    expect(manifest.shards[0].count).toBe(2)

    const changes = await tracker.getChanges()
    expect(changes).toHaveLength(2)
  })

  it('should perform incremental update for small changes', async () => {
    const storage = new MemorySitemapStorage(baseUrl)
    const tracker = new MemoryChangeTracker()
    const initialEntries = Array.from({ length: 100 }, (_, i) => ({ url: `/${i}` }))
    const generator = new IncrementalGenerator({
      baseUrl,
      storage,
      changeTracker: tracker,
      providers: [
        {
          getEntries: () => initialEntries,
        },
      ],
      maxEntriesPerFile: 10,
      filename: 'sitemap.xml',
      pretty: true,
    })

    await generator.generateFull()
    await tracker.clear()

    const since = new Date()
    await new Promise((resolve) => setTimeout(resolve, 10))

    const updatedEntry = { url: '/5', priority: 0.5 }
    await tracker.track({
      type: 'update',
      url: '/5',
      entry: updatedEntry,
      timestamp: new Date(),
    })

    await generator.generateIncremental(since)

    const sitemap1 = await storage.read('sitemap-1.xml')
    const entries1 = SitemapParser.parse(sitemap1!)
    const entry5 = entries1.find((e) => e.url === 'https://example.com/5')
    expect(entry5?.priority).toBe(0.5)

    const manifest = JSON.parse((await storage.read('sitemap-manifest.json'))!)
    expect(manifest.shards.find((s: any) => s.filename === 'sitemap-1.xml').count).toBe(10)
  })

  it('should trigger full rebuild when changeRatio > 0.3', async () => {
    const storage = new MemorySitemapStorage(baseUrl)
    const tracker = new MemoryChangeTracker()

    const initialEntries = Array.from({ length: 10 }, (_, i) => ({ url: `/${i}` }))

    const generator = new IncrementalGenerator({
      baseUrl,
      storage,
      changeTracker: tracker,
      providers: [
        {
          getEntries: () => initialEntries,
        },
      ],
      filename: 'sitemap.xml',
    })

    await generator.generateFull()

    const newEntries = Array.from({ length: 4 }, (_, i) => ({ url: `/${i + 10}` }))
    initialEntries.push(...newEntries)

    for (const entry of newEntries) {
      await tracker.track({
        type: 'add',
        url: entry.url,
        entry,
        timestamp: new Date(),
      })
    }

    await generator.generateIncremental()

    const manifest = JSON.parse((await storage.read('sitemap-manifest.json'))!)
    expect(manifest.shards[0].count).toBe(14)
  })
})
