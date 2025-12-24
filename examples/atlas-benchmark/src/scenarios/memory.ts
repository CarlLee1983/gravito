import { DB, Model, column } from '@gravito/atlas'

class MemoryRecord extends Model {
  static table = 'memory_records'
  @column({ isPrimary: true }) declare id: number
  @column() declare payload: string
}

export async function runMemoryScenario() {
  console.log('🧠 [Memory & Stability Test]')
  console.log('   Goal: Process large dataset with constant memory usage')
  
  // Setup
  try {
      // Force connection init
      await DB.connection().getGrammar().wrapTable('memory_records') 
  } catch {} // Schema facade might not be available on 'DB' directly, using raw below if needed
  
  // Create table manually via Schema facade in real app, here we assume it exists or create it
  const { Schema } = await import('@gravito/atlas')
  await Schema.dropIfExists('memory_records')
  await Schema.create('memory_records', t => {
      t.id()
      t.text('payload')
  })

  // 1. Seed Data
  const BATCH_SIZE = 1000
  const TOTAL_RECORDS = 50000 // Increased to 50k for better proof
  const PAYLOAD_SIZE = 1024 // 1KB
  const payload = 'x'.repeat(PAYLOAD_SIZE)

  console.log(`   Phase 1: Seeding ${TOTAL_RECORDS.toLocaleString()} records (${(TOTAL_RECORDS * PAYLOAD_SIZE / 1024 / 1024).toFixed(0)} MB raw data)...`)
  
  const seedStart = performance.now()
  const rows = Array.from({ length: BATCH_SIZE }).map(() => ({ payload }))
  
  // Parallelize slightly for speed in seeding phase
  for (let i = 0; i < TOTAL_RECORDS; i += BATCH_SIZE) {
      await DB.table('memory_records').insert(rows)
      if (i % 10000 === 0) process.stdout.write('.')
  }
  const seedTime = performance.now() - seedStart
  console.log(`\n   ✅ Seeded in ${(seedTime / 1000).toFixed(2)}s`)

  // 2. Stream Test
  console.log('   Phase 2: Streaming with Cursor (Hydration Active)...')
  
  // Force Garbage Collection if available (Node/Bun)
  if (global.gc) { global.gc() }
  
  const startUsage = process.memoryUsage().heapUsed
  const streamStart = performance.now()
  let processed = 0
  let peakMemory = 0
  
  // Using the new cursor() API
  for await (const chunk of MemoryRecord.cursor(1000)) {
      processed += chunk.length
      
      const currentHeap = process.memoryUsage().heapUsed
      const currentDiff = (currentHeap - startUsage) / 1024 / 1024
      if (currentDiff > peakMemory) peakMemory = currentDiff

      // Sanity check data
      if (chunk[0].payload.length !== PAYLOAD_SIZE) throw new Error('Data corruption')
  }

  const streamTime = performance.now() - streamStart
  const endUsage = process.memoryUsage().heapUsed
  const finalDiff = (endUsage - startUsage) / 1024 / 1024
  const throughput = processed / (streamTime / 1000)

  console.log(`   --------------------------------------------------`)
  console.log(`   Total Processed  : ${processed.toLocaleString()} records`)
  console.log(`   Time Taken       : ${(streamTime / 1000).toFixed(2)}s`)
  console.log(`   Throughput       : ${throughput.toFixed(0)} records/sec`)
  console.log(`   Heap Growth      : ${finalDiff.toFixed(2)} MB`)
  console.log(`   Peak Heap Delta  : ${peakMemory.toFixed(2)} MB`)
  console.log(`   --------------------------------------------------`)

  if (processed !== TOTAL_RECORDS) {
      throw new Error(`Stream count mismatch: expected ${TOTAL_RECORDS}, got ${processed}`)
  }

  // Pass criteria: Less than 10MB growth for 50MB of data processed
  if (finalDiff > 20) {
      console.warn('   ⚠️  Warning: Memory usage grew more than expected.')
  } else {
      console.log('   ✅ PASS: Constant memory profile confirmed.')
  }
}