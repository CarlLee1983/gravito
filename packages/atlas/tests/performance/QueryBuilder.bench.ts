import { PostgresGrammar } from '../../src/grammar/PostgresGrammar'
import { QueryBuilder } from '../../src/query/QueryBuilder'

// Mock connection
const connection = {
  getDriver: () => ({}),
  table: (t: string) => new QueryBuilder(connection as any, new PostgresGrammar(), t),
} as any

function bench(name: string, fn: () => void, iterations = 10000) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  const duration = end - start
  console.log(`${name}: ${duration.toFixed(2)}ms (${(duration / iterations).toFixed(4)}ms/op)`)
}

console.log('--- QueryBuilder Clone Benchmark ---\n')

// Setup: Create a query with some state
const builder = new QueryBuilder(connection, new PostgresGrammar(), 'users')
for (let i = 0; i < 50; i++) {
  builder.where(`col${i}`, '=', i)
  builder.orderBy(`col${i}`)
}

// Test 1: Clone for read-only operations (most common use case - pagination, count, etc.)
// This is where copy-on-write optimization shines
bench(
  'builder.clone() for read-only (50 wheres)',
  () => {
    const cloned = builder.clone()
    // Simulate read-only operation (toSql, getBindings, etc.)
    cloned.toSql()
    cloned.getBindings()
  },
  10000
)

// Test 2: Clone and modify (triggers copy-on-write)
const cloned = builder.clone()
bench(
  'cloned.where() triggers copy-on-write',
  () => {
    const c = cloned.clone()
    c.where('new', '=', 1) // This triggers ensureOwnState()
  },
  10000
)

// Test 3: Original query modification with clones (tests independence)
console.log('\n--- Independence Test ---')
const testBuilder = new QueryBuilder(connection, new PostgresGrammar(), 'users')
testBuilder.where('status', 'active').limit(10)
const testClone = testBuilder.clone()

// Modify original
testBuilder.where('role', 'admin')

// Clone should be independent
const cloneSql = testClone.toSql()
const _originalSql = testBuilder.toSql()

if (cloneSql.includes('role')) {
  console.log('❌ FAIL: Clone was affected by original modification')
} else if (cloneSql.includes('status')) {
  console.log('✅ PASS: Clone is independent (copy-on-write working correctly)')
} else {
  console.log('⚠️  WARN: Unexpected result')
}
