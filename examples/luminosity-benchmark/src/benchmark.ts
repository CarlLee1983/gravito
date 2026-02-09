import fs from 'node:fs'
import path from 'node:path'
import { OrbitSitemap } from '@gravito/constellation'
import Database from 'better-sqlite3'
import chalk from 'chalk'
import Table from 'cli-table3'

const DB_PATH = path.join(process.cwd(), 'db.sqlite')
const OUT_DIR = path.join(process.cwd(), 'dist-sitemaps')

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database not found. Please run "bun run seed" first.')
  process.exit(1)
}

const db = new Database(DB_PATH, { readonly: true })

console.log('🌌 Luminosity Benchmark: Starting Sitemap Generation...')
console.log('--------------------------------------------------')

// Helper to track memory
const getMemoryUsage = () => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024
  return `${Math.round(used)} MB`
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
        const stmt = db.prepare('SELECT slug, updated_at, priority FROM products')

        // Use iterator to stream rows one by one (low memory)
        for (const row of stmt.iterate() as Iterable<{
          slug: string
          updated_at: string
          priority: number
        }>) {
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

          yield {
            url: `/products/${row.slug}`,
            lastmod: row.updated_at,
            priority: row.priority,
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

// 3. Report
console.log('\n\n==================================================')
console.log(chalk.bold.green('   GRAVITO LUMINOSITY - FIREPOWER REPORT'))
console.log('==================================================')

const table = new Table()
table.push(
  { '🌌 Total URLs': processedCount.toLocaleString() },
  { '⏱️  Time Elapsed': `${duration.toFixed(2)}s` },
  { '🧠 Max Memory': chalk.yellow(`${Math.round(maxMemory)} MB`) }, // Highlight low memory
  { '📂 Files Generated': Math.ceil(processedCount / 50000) },
  { '🚀 Throughput': `${Math.round(processedCount / duration).toLocaleString()} URLs/sec` }
)

console.log(table.toString())
console.log(`\n✅ Sitemaps generated in: ${OUT_DIR}`)
