/**
 * Performance benchmarks for the async event system.
 * Compares sync vs async dispatch, priority queue performance, and retry overhead.
 */

import { HookManager } from '../src/HookManager'

// Configuration
const ITERATIONS = 1000
const CONCURRENT_EVENTS = 100

/**
 * Benchmark: Synchronous dispatch vs Asynchronous dispatch
 */
async function benchmarkSyncVsAsync() {
  console.log('\n====== Sync vs Async Performance ======')

  // Test 1: Pure Synchronous Mode
  console.log('\n[1] Synchronous Mode:')
  const syncManager = new HookManager({
    asyncByDefault: false,
    migrationMode: 'sync',
  })

  let syncResults = 0
  syncManager.addAction('bench:event', () => {
    syncResults++
  })

  const syncStart = Date.now()
  for (let i = 0; i < ITERATIONS; i++) {
    await syncManager.doAction('bench:event', {})
  }
  const syncTime = Date.now() - syncStart

  console.log(`  Processed: ${syncResults} events`)
  console.log(`  Time: ${syncTime}ms`)
  console.log(`  Throughput: ${Math.round((ITERATIONS / syncTime) * 1000)} events/sec`)

  // Test 2: Pure Asynchronous Mode
  console.log('\n[2] Asynchronous Mode:')
  const asyncManager = new HookManager({
    asyncByDefault: false,
    migrationMode: 'sync',
  })

  let asyncResults = 0
  asyncManager.addAction('bench:event', () => {
    asyncResults++
  })

  const asyncStart = Date.now()
  for (let i = 0; i < ITERATIONS; i++) {
    await asyncManager.doActionAsync('bench:event', {}, { async: true })
  }

  // Wait for async processing
  await new Promise((resolve) => setTimeout(resolve, 500))

  const asyncTime = Date.now() - asyncStart

  console.log(`  Processed: ${asyncResults} events`)
  console.log(`  Time: ${asyncTime}ms`)
  console.log(`  Throughput: ${Math.round((asyncResults / asyncTime) * 1000)} events/sec`)

  // Calculate speedup
  const speedup = syncTime / asyncTime
  console.log(
    `\n✅ Speedup: ${speedup.toFixed(2)}x (async is ${speedup > 1 ? 'faster' : 'slower'})`
  )

  return speedup
}

/**
 * Benchmark: Priority Queue Performance
 */
async function benchmarkPriorityQueue() {
  console.log('\n====== Priority Queue Performance ======')

  const manager = new HookManager({
    asyncByDefault: false,
    migrationMode: 'sync',
  })

  let processedCount = 0
  manager.addAction('priority:event', () => {
    processedCount++
  })

  const start = Date.now()

  // Enqueue events with mixed priorities
  for (let i = 0; i < ITERATIONS; i++) {
    const priority = i % 3 === 0 ? 'high' : i % 2 === 0 ? 'normal' : 'low'
    await manager.doActionAsync('priority:event', {}, { priority: priority as any, async: true })
  }

  // Wait for processing
  await new Promise((resolve) => setTimeout(resolve, 500))

  const time = Date.now() - start

  console.log(`  Processed: ${processedCount} events`)
  console.log(`  Time: ${time}ms`)
  console.log(`  Throughput: ${Math.round((processedCount / time) * 1000)} events/sec`)
}

/**
 * Benchmark: Idempotency Deduplication
 */
async function benchmarkIdempotency() {
  console.log('\n====== Idempotency Performance ======')

  const manager = new HookManager({
    asyncByDefault: false,
    migrationMode: 'sync',
  })

  let processedCount = 0
  manager.addAction('idempotent:event', () => {
    processedCount++
  })

  const start = Date.now()

  // Send same event with same idempotency key multiple times
  for (let i = 0; i < 100; i++) {
    await manager.doActionAsync(
      'idempotent:event',
      {},
      {
        async: true,
        idempotencyKey: 'event-123', // Same key for all
        ttl: 5000,
      }
    )
  }

  // Wait for processing
  await new Promise((resolve) => setTimeout(resolve, 200))

  const time = Date.now() - start

  console.log(`  Sent: 100 events with same idempotency key`)
  console.log(`  Processed (deduplicated): ${processedCount} events`)
  console.log(`  Deduplication Rate: ${(((100 - processedCount) / 100) * 100).toFixed(1)}%`)
  console.log(`  Time: ${time}ms`)
}

/**
 * Benchmark: Partition Ordering
 */
async function benchmarkPartitionOrdering() {
  console.log('\n====== Partition Ordering Performance ======')

  const manager = new HookManager({
    asyncByDefault: false,
    migrationMode: 'sync',
  })

  const results: string[] = []
  manager.addAction('partition:event', (data: any) => {
    results.push(data.id)
  })

  const start = Date.now()

  // Enqueue events with partition ordering
  for (let i = 0; i < 10; i++) {
    await manager.doActionAsync(
      'partition:event',
      { id: `partition-1-${i}` },
      {
        async: true,
        ordering: 'partition',
        partitionKey: 'partition-1',
      }
    )
  }

  // Wait for processing
  await new Promise((resolve) => setTimeout(resolve, 300))

  const time = Date.now() - start

  console.log(`  Enqueued: 10 events with partition ordering`)
  console.log(`  Processed: ${results.length} events`)
  console.log(`  Time: ${time}ms`)
  console.log(
    `  Ordered: ${results.every((id, idx, arr) => idx === 0 || id > arr[idx - 1]) ? 'Yes' : 'No'}`
  )
}

/**
 * Benchmark: Concurrent Events
 */
async function benchmarkConcurrency() {
  console.log('\n====== Concurrent Events Performance ======')

  const manager = new HookManager({
    asyncByDefault: false,
    migrationMode: 'sync',
  })

  let processedCount = 0
  manager.addAction('concurrent:event', () => {
    processedCount++
  })

  const start = Date.now()

  // Enqueue many events concurrently
  const promises = []
  for (let i = 0; i < CONCURRENT_EVENTS; i++) {
    promises.push(
      manager.doActionAsync(
        'concurrent:event',
        { id: i },
        {
          async: true,
        }
      )
    )
  }

  await Promise.all(promises)

  // Wait for processing
  await new Promise((resolve) => setTimeout(resolve, 500))

  const time = Date.now() - start

  console.log(`  Concurrent Events: ${CONCURRENT_EVENTS}`)
  console.log(`  Processed: ${processedCount}`)
  console.log(`  Time: ${time}ms`)
  console.log(`  Throughput: ${Math.round((processedCount / time) * 1000)} events/sec`)
}

/**
 * Benchmark: Timeout Handling
 */
async function benchmarkTimeout() {
  console.log('\n====== Timeout Handling Performance ======')

  const manager = new HookManager({
    asyncByDefault: false,
    migrationMode: 'sync',
  })

  let processedCount = 0
  manager.addAction('timeout:event', async () => {
    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, 10))
    processedCount++
  })

  const start = Date.now()

  // Enqueue events with timeout
  for (let i = 0; i < 100; i++) {
    await manager.doActionAsync(
      'timeout:event',
      {},
      {
        async: true,
        timeout: 100, // Should be sufficient for 10ms work
      }
    )
  }

  // Wait for processing
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const time = Date.now() - start

  console.log(`  Events: 100`)
  console.log(`  Processed: ${processedCount}`)
  console.log(`  Success Rate: ${(processedCount / 100) * 100}%`)
  console.log(`  Time: ${time}ms`)
}

/**
 * Main benchmark runner
 */
async function runBenchmarks() {
  console.log('\n╔════════════════════════════════════════════╗')
  console.log('║   Event System Performance Benchmarks      ║')
  console.log('╚════════════════════════════════════════════╝')

  try {
    const syncAsyncSpeedup = await benchmarkSyncVsAsync()
    await benchmarkPriorityQueue()
    await benchmarkIdempotency()
    await benchmarkPartitionOrdering()
    await benchmarkConcurrency()
    await benchmarkTimeout()

    // Summary
    console.log('\n╔════════════════════════════════════════════╗')
    console.log('║            Benchmark Summary              ║')
    console.log('╚════════════════════════════════════════════╝')

    if (syncAsyncSpeedup >= 1) {
      console.log('✅ Async mode is performant')
    } else {
      console.log('⚠️  Async mode needs optimization')
    }

    console.log('\n✅ All benchmarks completed successfully!')
  } catch (error) {
    console.error('❌ Benchmark failed:', error)
    process.exit(1)
  }
}

// Run benchmarks
runBenchmarks()
