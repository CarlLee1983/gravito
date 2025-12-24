import { DB, Schema, Model, column } from '@gravito/atlas'

class BenchItem extends Model {
  static table = 'bench_items'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string
  @column() declare value: number
  @column() declare created_at: Date
}

export async function runPerformanceScenario() {
  console.log('⚡ [Throughput & Latency Test]')
  
  await Schema.dropIfExists('bench_items')
  await Schema.create('bench_items', t => {
    t.id()
    t.string('name')
    t.integer('value')
    t.timestamps()
  })

  // 1. Bulk Insert Performance
  const BATCH_COUNT = 100
  const ITEMS_PER_BATCH = 100
  const TOTAL = BATCH_COUNT * ITEMS_PER_BATCH
  
  console.log(`   Phase 1: Bulk Inserting ${TOTAL.toLocaleString()} records...`)
  
  const insertStart = performance.now()
  const data = Array.from({ length: ITEMS_PER_BATCH }).map((_, i) => ({
      name: `Item ${i}`,
      value: i,
      created_at: new Date()
  }))

  for (let i = 0; i < BATCH_COUNT; i++) {
      await DB.table('bench_items').insert(data)
  }
  
  const insertTime = performance.now() - insertStart
  const insertOPS = TOTAL / (insertTime / 1000)
  console.log(`   👉 Insert Speed: ${insertOPS.toFixed(0)} ops/sec`)

  // 2. Select Hydration Performance (Full Object)
  console.log(`   Phase 2: Hydrating 5,000 Models (Active Record)...`)
  
  const selectStart = performance.now()
  const models = await BenchItem.query().limit(5000).get()
  const selectTime = performance.now() - selectStart
  
  const hydrateOPS = 5000 / (selectTime / 1000)
  console.log(`   👉 Read & Hydrate: ${hydrateOPS.toFixed(0)} ops/sec`)

  // 3. Raw Read Performance (No Hydration)
  console.log(`   Phase 3: Raw Read 5,000 Rows...`)
  
  const rawStart = performance.now()
  await DB.table('bench_items').limit(5000).get()
  const rawTime = performance.now() - rawStart
  
  const rawOPS = 5000 / (rawTime / 1000)
  console.log(`   👉 Raw Read: ${rawOPS.toFixed(0)} ops/sec`)
  
  const overhead = ((selectTime - rawTime) / rawTime) * 100
  console.log(`   ℹ️  ORM Overhead: ${overhead.toFixed(1)}%`)
}
