import fs from 'node:fs'
import path from 'node:path'
import { OrbitSitemap } from '@gravito/constellation'
import chalk from 'chalk'
import Table from 'cli-table3'

const OUT_DIR = path.join(process.cwd(), 'dist-sitemaps')
const TOTAL_URLS = 1_000_000

console.log('🌌 Luminosity Benchmark: Starting Sitemap Generation...')
console.log('--------------------------------------------------')

// Helper to track memory
const getMemoryUsage = () => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024
  return `${Math.round(used)} MB`
}

// Attempt garbage collection before benchmark
if (typeof global.gc === 'function') {
  global.gc()
}

const startTime = performance.now()
let processedCount = 0
let maxMemory = 0

// 1. Configure Sitemap
const sitemap = OrbitSitemap.static({
  baseUrl: 'https://store.example.com',
  outDir: OUT_DIR,
  maxEntriesPerFile: 50_000, // Google's limit

  // The core magic: Streaming Provider
  providers: [
    {
      async *getEntries() {
        // Generate URLs on-the-fly instead of reading from database
        for (let i = 0; i < TOTAL_URLS; i++) {
          processedCount++

          // Track peak memory
          const currentMem = process.memoryUsage().heapUsed / 1024 / 1024
          if (currentMem > maxMemory) {
            maxMemory = currentMem
          }

          if (processedCount % 100_000 === 0) {
            process.stdout.write(
              `\r🚀 Processed: ${processedCount.toLocaleString()} | Mem: ${getMemoryUsage()}`
            )
          }

          const timestamp = new Date(Date.now() - Math.random() * 86400000).toISOString()
          const priority = (Math.random() * 10).toFixed(1)

          yield {
            url: `/products/item-${i.toString().padStart(7, '0')}`,
            lastmod: timestamp,
            priority: parseFloat(priority),
            changefreq: 'daily',
          }
        }
      },
    },
  ],
})

// 2. Run Generation
await sitemap.generate()

const endTime = performance.now()
const duration = (endTime - startTime) / 1000
const finalHeap = process.memoryUsage().heapUsed
const peakMemoryMB = Math.round(maxMemory)
const finalMemoryMB = Math.round(finalHeap / 1024 / 1024)
const throughput = Math.round(processedCount / duration)
const filesGenerated = Math.ceil(processedCount / 50000)

// 3. Report
console.log('\n\n==================================================')
console.log(chalk.bold.green('   GRAVITO LUMINOSITY - FIREPOWER REPORT'))
console.log('==================================================')

const table = new Table()
table.push(
  { '🌌 Total URLs': processedCount.toLocaleString() },
  { '⏱️  Time Elapsed': `${duration.toFixed(2)}s` },
  { '🧠 Peak Memory': chalk.yellow(`${peakMemoryMB} MB`) },
  { '🧠 Final Memory': chalk.cyan(`${finalMemoryMB} MB`) },
  { '📂 Files Generated': filesGenerated.toString() },
  { '🚀 Throughput': `${throughput.toLocaleString()} URLs/sec` }
)

console.log(table.toString())

// 效能指標對比
console.log('\n📊 Performance Metrics:')
console.log(`  ✓ Average time per URL: ${((duration / processedCount) * 1000).toFixed(3)} ms`)
console.log(`  ✓ Memory efficiency: ${(processedCount / peakMemoryMB).toFixed(0)} URLs per MB`)
console.log(`  ✓ Output size: ${(fs.statSync(OUT_DIR).size / 1024 / 1024).toFixed(1)} MB`)

console.log(`\n✅ Sitemaps generated in: ${OUT_DIR}`)
