import { appendFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { Compactor } from '../src/storage/Compactor'
import { JsonlLogger } from '../src/storage/JsonlLogger'

// Benchmark Configuration
const OPS_COUNT = 100_000
const DUPLICATE_RATE = 0.5 // 50% updates to existing URLs
const LOG_FILE = join(process.cwd(), 'bench-logs.jsonl')

async function main() {
  console.log(`🚀 Starting Compactor Benchmark`)
  console.log(`Ops: ${OPS_COUNT}, Duplicate Rate: ${DUPLICATE_RATE}`)

  // 1. Generate Data
  console.log('Generating log data...')
  await rm(LOG_FILE, { force: true })

  const startGen = performance.now()
  for (let i = 0; i < OPS_COUNT; i++) {
    const isUpdate = Math.random() < DUPLICATE_RATE
    // if update, pick a recently generated ID to simulate hot updates
    const id = isUpdate ? Math.floor(Math.random() * i) : i

    const entry = {
      op: 'add',
      timestamp: Date.now(),
      entry: {
        url: `/posts/post-${id}`,
        lastmod: new Date().toISOString(),
      },
    }
    await appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`)
  }
  const endGen = performance.now()
  console.log(`Generation took ${(endGen - startGen).toFixed(2)}ms`)

  // 2. Measure Compaction
  console.log('Running compaction...')

  // Track memory
  const startMem = process.memoryUsage().heapUsed
  const startCompact = performance.now()

  const logger = new JsonlLogger(LOG_FILE)
  const compactor = new Compactor(logger)
  const result = await compactor.compact([])

  const endCompact = performance.now()
  const endMem = process.memoryUsage().heapUsed

  const duration = endCompact - startCompact
  const memoryDiff = (endMem - startMem) / 1024 / 1024

  console.log('--- Results ---')
  console.log(`Time: ${duration.toFixed(2)}ms`)
  console.log(`Entries: ${result.length}`)
  console.log(`Memory Delta: ${memoryDiff.toFixed(2)} MB`)
  console.log(`Throughput: ${(OPS_COUNT / (duration / 1000)).toFixed(0)} ops/sec`)

  // Cleanup
  await rm(LOG_FILE)
}

main().catch(console.error)
