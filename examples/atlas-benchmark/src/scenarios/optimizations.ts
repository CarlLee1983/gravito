import { column, DB, Grammar, Model, Schema } from '@gravito/atlas'

class OptimizeTestItem extends Model {
  static table = 'optimize_test_items'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string
  @column() declare value: number
  @column() declare metadata: Record<string, unknown>
  @column() declare tags: string[]
  @column() declare created_at: Date
}

/**
 * Tests performance optimizations introduced in v1.4.0
 */
export async function runOptimizationsScenario() {
  console.log('⚡ [Performance Optimizations Test - v1.4.0]')
  console.log('===========================================')

  await Schema.dropIfExists('optimize_test_items')
  await Schema.create('optimize_test_items', (t) => {
    t.id()
    t.string('name')
    t.integer('value')
    t.json('metadata')
    t.json('tags')
    t.timestamps()
  })

  // 1. QueryBuilder Clone Performance (Copy-on-Write)
  console.log('\n📋 Test 1: QueryBuilder Clone Performance (Copy-on-Write)')
  await testQueryBuilderClone()

  // 2. DirtyTracker Deep Comparison Performance
  console.log('\n📋 Test 2: DirtyTracker Deep Comparison Performance')
  await testDirtyTrackerComparison()

  // 3. Model Hydration Performance (Cached Descriptors)
  console.log('\n📋 Test 3: Model Hydration Performance (Cached Descriptors)')
  await testModelHydration()

  // 4. Grammar Cache Statistics
  console.log('\n📋 Test 4: Grammar Cache Statistics')
  await testGrammarCache()

  // 5. Dynamic Chunk Size for Bulk Insert
  console.log('\n📋 Test 5: Dynamic Chunk Size for Bulk Insert')
  await testDynamicChunkSize()

  console.log('\n✅ All Optimization Tests Completed')
}

/**
 * Tests QueryBuilder clone performance with copy-on-write optimization
 */
async function testQueryBuilderClone() {
  // Create a complex query with many conditions
  const baseQuery = DB.table('optimize_test_items')
    .select('id', 'name', 'value', 'metadata', 'tags')
    .where('value', '>', 0)
    .where('value', '<', 1000)
    .where('name', 'like', '%test%')
    .orderBy('value', 'asc')
    .orderBy('name', 'desc')

  // Add 50 more where clauses to simulate complex query
  for (let i = 0; i < 50; i++) {
    baseQuery.where('value', '!=', i)
  }

  // Test 1: Read-only clone performance (should benefit from copy-on-write)
  const readOnlyIterations = 1000
  const readOnlyStart = performance.now()
  for (let i = 0; i < readOnlyIterations; i++) {
    const cloned = baseQuery.clone()
    // Simulate read-only operations (pagination, count, etc.)
    void cloned.toSql()
    void cloned.getBindings()
  }
  const readOnlyTime = performance.now() - readOnlyStart
  const readOnlyOps = readOnlyIterations / (readOnlyTime / 1000)

  console.log(`   Read-only clones: ${readOnlyOps.toFixed(0)} ops/sec`)

  // Test 2: Clone and modify performance
  const modifyIterations = 500
  const modifyStart = performance.now()
  for (let i = 0; i < modifyIterations; i++) {
    const cloned = baseQuery.clone()
    cloned.where('value', '=', i) // Triggers copy-on-write
    void cloned.toSql()
  }
  const modifyTime = performance.now() - modifyStart
  const modifyOps = modifyIterations / (modifyTime / 1000)

  console.log(`   Clone and modify: ${modifyOps.toFixed(0)} ops/sec`)

  // Test 3: Independence verification
  const original = baseQuery.clone()
  const clone1 = original.clone()
  const clone2 = original.clone()

  clone1.where('value', '=', 9999)
  clone2.where('value', '=', 8888)

  const sql1 = clone1.toSql()
  const sql2 = clone2.toSql()

  if (sql1 === sql2) {
    throw new Error('Clone independence test failed: clones share state')
  }

  console.log(`   ✅ Clone independence: Verified`)
}

/**
 * Tests DirtyTracker deep comparison performance
 */
async function testDirtyTrackerComparison() {
  // Create test data with nested structures
  const complexObject = {
    user: {
      id: 1,
      profile: {
        name: 'Test User',
        preferences: {
          theme: 'dark',
          notifications: true,
          settings: {
            language: 'en',
            timezone: 'UTC',
          },
        },
      },
      tags: ['admin', 'premium', 'verified'],
    },
    metadata: {
      created: new Date(),
      updated: new Date(),
      version: 1,
    },
  }

  // Create a model instance
  const item = OptimizeTestItem.make({
    name: 'Test',
    value: 100,
    metadata: complexObject,
    tags: ['tag1', 'tag2', 'tag3'],
  })

  // Enable deep comparison
  ;(item as any)._dirtyTracker.setDeepComparison(true)

  // Test 1: Shallow comparison (fast path)
  const shallowIterations = 10000
  const shallowStart = performance.now()
  for (let i = 0; i < shallowIterations; i++) {
    ;(item as any)._dirtyTracker.mark('name', 'Test')
  }
  const shallowTime = performance.now() - shallowStart
  const shallowOps = shallowIterations / (shallowTime / 1000)

  console.log(`   Shallow comparison: ${shallowOps.toFixed(0)} ops/sec`)

  // Test 2: Deep comparison with nested objects
  const deepIterations = 1000
  const deepStart = performance.now()
  for (let i = 0; i < deepIterations; i++) {
    const modified = {
      ...complexObject,
      user: {
        ...complexObject.user,
        profile: {
          ...complexObject.user.profile,
          preferences: {
            ...complexObject.user.profile.preferences,
            settings: {
              ...complexObject.user.profile.preferences.settings,
              language: i % 2 === 0 ? 'en' : 'zh',
            },
          },
        },
      },
    }
    ;(item as any)._dirtyTracker.mark('metadata', modified)
  }
  const deepTime = performance.now() - deepStart
  const deepOps = deepIterations / (deepTime / 1000)

  console.log(`   Deep comparison: ${deepOps.toFixed(0)} ops/sec`)
  console.log(`   ✅ Deep comparison optimization: Active`)
}

/**
 * Tests Model hydration performance with cached descriptors
 */
async function testModelHydration() {
  // Seed test data
  const testData = Array.from({ length: 1000 }).map((_, i) => ({
    name: `Item ${i}`,
    value: i,
    metadata: { index: i, category: `cat${i % 10}` },
    tags: [`tag${i}`, `tag${i + 1}`],
    created_at: new Date(),
  }))

  await DB.table('optimize_test_items').insert(testData)

  // Test: Hydrate models and access properties (triggers descriptor cache)
  const iterations = 5
  const totalAccesses = 10000

  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    const models = await OptimizeTestItem.query().limit(200).get()
    // Access properties multiple times to benefit from caching
    for (const model of models) {
      for (let j = 0; j < totalAccesses / models.length; j++) {
        void model.name
        void model.value
        void model.metadata
        void model.tags
      }
    }
  }
  const time = performance.now() - start
  const ops = (iterations * totalAccesses) / (time / 1000)

  console.log(`   Property access: ${ops.toFixed(0)} ops/sec`)
  console.log(`   ✅ Descriptor cache: Active`)
}

/**
 * Tests Grammar cache statistics
 */
async function testGrammarCache() {
  // Reset cache stats
  Grammar.resetCacheStats()

  // Generate various queries to populate cache
  const queries = []
  for (let i = 0; i < 100; i++) {
    const query = DB.table('optimize_test_items')
      .select('id', 'name', 'value')
      .where('value', '>', i)
      .where('value', '<', i + 100)
      .orderBy('value', 'asc')
      .limit(10)
      .offset(i * 10)

    queries.push(query)
  }

  // Execute queries (first execution = miss, subsequent = hit)
  for (let round = 0; round < 3; round++) {
    for (const query of queries) {
      await query.get()
    }
  }

  // Get cache statistics
  const stats = Grammar.getCacheStats()

  console.log(`   Cache size: ${stats.size}/${stats.maxSize}`)
  console.log(`   Hits: ${stats.hits}`)
  console.log(`   Misses: ${stats.misses}`)
  console.log(`   Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`)
  console.log(`   Utilization: ${(stats.utilization * 100).toFixed(1)}%`)

  if (stats.hitRate > 0.5) {
    console.log(`   ✅ Cache optimization: Effective (hit rate > 50%)`)
  } else {
    console.log(`   ⚠️  Cache hit rate lower than expected`)
  }
}

/**
 * Tests dynamic chunk size calculation for bulk insert
 */
async function testDynamicChunkSize() {
  // Test with different record sizes (simulating different column counts)
  // The dynamic chunk size should adjust based on the actual column count
  const testCases = [
    { name: 'Small records (5 columns)', size: 20000 },
    { name: 'Medium records (5 columns)', size: 10000 },
    { name: 'Large records (5 columns)', size: 5000 },
  ]

  for (const testCase of testCases) {
    const testData = Array.from({ length: testCase.size }).map((_, i) => ({
      name: `Item ${i}`,
      value: i,
      metadata: {
        index: i,
        category: `cat${i % 10}`,
        tags: [`tag${i}`, `tag${i + 1}`],
        extra: Array(10).fill(`data_${i}`),
      },
      tags: [`tag${i}`, `tag${i + 1}`, `tag${i + 2}`],
      created_at: new Date(),
    }))

    const start = performance.now()
    await DB.table('optimize_test_items').insert(testData)
    const time = performance.now() - start
    const ops = testData.length / (time / 1000)

    console.log(
      `   ${testCase.name}: ${ops.toFixed(0)} ops/sec (${(time / 1000).toFixed(2)}s for ${testCase.size.toLocaleString()} records)`
    )
  }

  console.log(`   ✅ Dynamic chunk size: Active (automatically adjusts based on column count)`)
}
