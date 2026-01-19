import { performance } from 'perf_hooks'
import { SitemapGenerator } from '../src/core/SitemapGenerator'
import { MemorySitemapStorage } from '../src/storage/MemorySitemapStorage'

async function runBenchmark(count: number, shardSize = 50000) {
  const storage = new MemorySitemapStorage('https://example.com')

  const provider = {
    async getEntries() {
      return Array.from({ length: count }, (_, i) => ({
        url: `/page-${i}`,
        lastmod: new Date(),
        changefreq: 'daily' as const,
        priority: 0.8,
      }))
    },
  }

  const generator = new SitemapGenerator({
    baseUrl: 'https://example.com',
    storage,
    providers: [provider],
    maxEntriesPerFile: shardSize,
    pretty: false,
  })

  const start = performance.now()
  await generator.run()
  const end = performance.now()

  const filesCount = (storage as any).files.size
  console.log(
    `Full generation for ${count} entries (shards: ${filesCount}): ${(end - start).toFixed(2)}ms`
  )
  return end - start
}

async function main() {
  console.log('--- Full Generation Benchmark ---')
  await runBenchmark(1000)
  await runBenchmark(10000)
  await runBenchmark(50000)
  await runBenchmark(100000)
  await runBenchmark(500000)
}

main().catch(console.error)
