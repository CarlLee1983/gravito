import { MemoryStore } from '../src/stores/MemoryStore'

const OPERATIONS = 100_000

async function benchmark() {
  console.log(`\nStarting MemoryStore Benchmark (${OPERATIONS.toLocaleString()} ops)\n`)

  const store = new MemoryStore({ maxItems: OPERATIONS * 2 }) // No eviction yet

  // WRITE
  let start = performance.now()
  for (let i = 0; i < OPERATIONS; i++) {
    await store.put(`key:${i}`, i, 3600)
  }
  let end = performance.now()
  let duration = end - start
  console.log(
    `WRITE: ${(OPERATIONS / (duration / 1000)).toFixed(0)} ops/sec (${duration.toFixed(2)}ms)`
  )

  // READ (HIT)
  start = performance.now()
  for (let i = 0; i < OPERATIONS; i++) {
    await store.get(`key:${i}`)
  }
  end = performance.now()
  duration = end - start
  console.log(
    `READ (HIT): ${(OPERATIONS / (duration / 1000)).toFixed(0)} ops/sec (${duration.toFixed(2)}ms)`
  )

  // READ (MISS)
  start = performance.now()
  for (let i = 0; i < OPERATIONS; i++) {
    await store.get(`missing:${i}`)
  }
  end = performance.now()
  duration = end - start
  console.log(
    `READ (MISS): ${(OPERATIONS / (duration / 1000)).toFixed(0)} ops/sec (${duration.toFixed(2)}ms)`
  )

  // EVICTION
  console.log(`\nTesting Eviction (Limit 5,000, Write 10,000)...`)
  const smallStore = new MemoryStore({ maxItems: 5000 })
  const EVICTION_OPS = 10_000

  start = performance.now()
  for (let i = 0; i < EVICTION_OPS; i++) {
    await smallStore.put(`key:${i}`, i, 3600)
  }
  end = performance.now()
  duration = end - start
  console.log(
    `WRITE w/ EVICTION: ${(EVICTION_OPS / (duration / 1000)).toFixed(0)} ops/sec (${duration.toFixed(2)}ms)`
  )

  const stats = smallStore.getStats()
  console.log(`Stats: Size=${stats.size}, Evictions=${stats.evictions}`)

  if (stats.size !== 5000) {
    console.error('❌ Size check failed!')
  }
  if (stats.evictions !== 5000) {
    console.error('❌ Eviction check failed!')
  }
}

benchmark().catch(console.error)
