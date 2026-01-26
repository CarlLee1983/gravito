import { SitemapGenerator } from '../src/core/SitemapGenerator'
import { MemorySitemapStorage } from '../src/storage/MemorySitemapStorage'

async function profileMemory(count: number) {
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
    maxEntriesPerFile: 50000,
    pretty: false,
  })

  const initialMemory = process.memoryUsage().heapUsed
  await generator.run()
  const peakMemory = process.memoryUsage().heapUsed

  console.log(`Memory profiling for ${count} entries:`)
  console.log(`- Initial: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`)
  console.log(`- Peak: ${(peakMemory / 1024 / 1024).toFixed(2)} MB`)
  console.log(`- Used: ${((peakMemory - initialMemory) / 1024 / 1024).toFixed(2)} MB`)
}

async function main() {
  console.log('--- Memory Profiling ---')
  await profileMemory(10000)
  await profileMemory(50000)
  await profileMemory(100000)
  await profileMemory(500000)
}

main().catch(console.error)
