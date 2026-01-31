import { performance } from 'node:perf_hooks'
import { MemoryChangeTracker } from '../src/core/ChangeTracker'
import { IncrementalGenerator } from '../src/core/IncrementalGenerator'
import { MemorySitemapStorage } from '../src/storage/MemorySitemapStorage'

async function runBenchmark(totalCount: number, changeCount: number) {
  const storage = new MemorySitemapStorage('https://example.com')
  const tracker = new MemoryChangeTracker()

  const provider = {
    async getEntries() {
      return Array.from({ length: totalCount }, (_, i) => ({
        url: `/page-${i}`,
        lastmod: new Date(),
        changefreq: 'daily' as const,
        priority: 0.8,
      }))
    },
  }

  const generator = new IncrementalGenerator({
    baseUrl: 'https://example.com',
    storage,
    providers: [provider],
    changeTracker: tracker,
    autoTrack: true,
    generateManifest: true,
  })

  await generator.generateFull()

  const now = new Date()
  for (let i = 0; i < changeCount; i++) {
    await tracker.track({
      type: 'update',
      url: `/page-${i}`,
      entry: { url: `/page-${i}`, lastmod: now, priority: 0.9 },
      timestamp: now,
    })
  }

  const start = performance.now()
  await generator.generateIncremental(now)
  const end = performance.now()

  console.log(
    `Incremental generation for ${changeCount}/${totalCount} changes: ${(end - start).toFixed(2)}ms`
  )
  return end - start
}

async function main() {
  console.log('--- Incremental Generation Benchmark ---')
  await runBenchmark(10000, 100)
  await runBenchmark(50000, 500)
  await runBenchmark(100000, 1000)
  await runBenchmark(500000, 100)
}

main().catch(console.error)
