import { column, Grammar, Model } from './src'
import { PostgresGrammar } from './src/grammar/PostgresGrammar'
import { DirtyTracker } from './src/orm/model/DirtyTracker'

function runBench(name: string, fn: () => void, iterations = 10000) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  console.log(
    `${name}: ${(end - start).toFixed(4)}ms for ${iterations} iterations (${((end - start) / iterations).toFixed(6)}ms/op)`
  )
}

// 1. DirtyTracker
console.log('--- DirtyTracker Bench ---')
const tracker = new DirtyTracker()
const data: any = {}
for (let i = 0; i < 100; i++) {
  data[`prop${i}`] = `value${i}`
}
tracker.setOriginal(data)

runBench('mark dirty (100 attributes)', () => {
  tracker.mark('prop0', 'New Value')
  tracker.mark('prop0', 'value0')
})

// 2. Model Hydration
console.log('\n--- Model Hydration Bench ---')
class User extends Model {
  static override table = 'users'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string
  @column() declare email: string
}
const row = { id: 1, name: 'Carl', email: 'carl@gravito.dev' }

runBench('Model.hydrate', () => {
  User.hydrate(row)
})

// 3. Grammar Compilation
console.log('\n--- Grammar Compilation Bench ---')
const grammar = new PostgresGrammar()
const query = {
  table: 'users',
  columns: ['id', 'name', 'email'],
  distinct: false,
  wheres: [{ type: 'basic', column: 'status', operator: '=', value: 'active', boolean: 'and' }],
  orders: [{ column: 'created_at', direction: 'desc' }],
  joins: [],
  groups: [],
  havings: [],
} as any

runBench('compileSelect (with cache)', () => {
  Grammar.useCache = true
  grammar.compileSelect(query)
})

runBench('compileSelect (no cache)', () => {
  Grammar.useCache = false
  grammar.compileSelect(query)
})
