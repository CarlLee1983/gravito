import { performance } from 'node:perf_hooks'
import { SitemapStream } from '../src/core/SitemapStream'

async function runBenchmark(count: number) {
  const stream = new SitemapStream({
    baseUrl: 'https://example.com',
    pretty: false,
  })

  const entries = Array.from({ length: count }, (_, i) => ({
    url: `/page-${i}`,
    lastmod: new Date(),
    changefreq: 'daily' as const,
    priority: 0.8,
  }))

  stream.addAll(entries)

  const start = performance.now()
  const xml = stream.toXML()
  const end = performance.now()

  if (xml.length === 0) {
    throw new Error('Generated empty XML')
  }

  console.log(
    `XML generation for ${count} entries: ${(end - start).toFixed(2)}ms (${((count / (end - start)) * 1000).toFixed(0)} entries/sec)`
  )
  return end - start
}

async function main() {
  console.log('--- XML Stream Benchmark ---')
  await runBenchmark(1000)
  await runBenchmark(10000)
  await runBenchmark(50000)
  await runBenchmark(100000)
}

main().catch(console.error)
