import { DB } from '../../src/DB'
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

console.log('--- QueryBuilder Clone Benchmark ---')

const builder = new QueryBuilder(connection, new PostgresGrammar(), 'users')
// Add some state
for (let i = 0; i < 50; i++) {
  builder.where(`col${i}`, '=', i)
  builder.orderBy(`col${i}`)
}

bench(
  'builder.clone() (50 wheres)',
  () => {
    builder.clone()
  },
  10000
)

const cloned = builder.clone()
bench(
  'cloned.where() (modification)',
  () => {
    // Should trigger copy on write if implemented
    const c = cloned.clone()
    c.where('new', '=', 1)
  },
  10000
)
