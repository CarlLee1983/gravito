import { column } from '../../src/orm/model/decorators'
import { Model } from '../../src/orm/model/Model'

class BenchUser extends Model {
  static table = 'bench_users'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string
  @column() declare email: string
  @column() declare age: number

  getFullNameAttribute() {
    return `${this.name} (${this.age})`
  }
}

function generateRows(count: number) {
  const rows = []
  for (let i = 0; i < count; i++) {
    rows.push({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      age: 20 + (i % 50),
    })
  }
  return rows
}

// Manual bench function since bun:test bench not working in script mode
function runBench(name: string, fn: () => void, iterations = 1000) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  const duration = end - start
  console.log(`${name}: ${duration.toFixed(2)}ms (${(duration / iterations).toFixed(4)}ms/op)`)
}

console.log('--- Model Proxy Benchmark ---')

const rows = generateRows(1000)

runBench(
  'Model.hydrate (1000 rows)',
  () => {
    rows.forEach((row) => {
      BenchUser.hydrate(row)
    })
  },
  50
) // 50 iterations of 1000 rows

const user = BenchUser.hydrate(rows[0])

runBench(
  'Attribute Access (10000 ops)',
  () => {
    const _ = user.name
    const __ = user.email
  },
  1000
)

runBench(
  'Accessor Access (10000 ops)',
  () => {
    const _ = (user as any).fullName
  },
  1000
)
