import { bench, group, run } from 'mitata'
import { PostgresGrammar } from '../src/grammar/PostgresGrammar'
import { Model } from '../src/orm/model/Model'
import { QueryBuilder } from '../src/query/QueryBuilder'

const mockGrammar = new PostgresGrammar()
const mockConnection: any = {
  getGrammar: () => mockGrammar,
  getDriver: () => ({
    getDriverName: () => 'postgres',
  }),
  getTracer: () => undefined,
  table: (name: string) => new QueryBuilder(mockConnection, mockGrammar, name),
}

group('QueryBuilder Clone (CoW)', () => {
  const builder = new QueryBuilder(mockConnection, mockGrammar, 'users')
  for (let i = 0; i < 20; i++) {
    builder.where(`col_${i}`, '=', i)
  }

  bench('clone (no modification)', () => {
    builder.clone()
  })

  bench('clone and modify (trigger copy)', () => {
    const cloned = builder.clone()
    cloned.where('new_col', '=', 1)
  })
})

group('Grammar Compilation (Cache)', () => {
  const builder = new QueryBuilder(mockConnection, mockGrammar, 'users')
    .where('id', 1)
    .where('active', true)
    .orderBy('created_at', 'desc')

  const query = builder.getCompiledQuery()

  bench('compileSelect (cached)', () => {
    mockGrammar.compileSelect(query)
  })
})

class User extends Model {
  static override table = 'users'
  declare id: number
  declare name: string
  declare email: string
}

group('Model Hydration', () => {
  const data = {
    id: 1,
    name: 'Carl',
    email: 'carl@example.com',
    created_at: new Date(),
    updated_at: new Date(),
  }

  bench('User.hydrate', () => {
    User.hydrate(data)
  })
})

group('Dirty Tracking', () => {
  const user = User.hydrate({ id: 1, name: 'Carl' })

  bench('isDirty (clean)', () => {
    user.isDirty
  })

  bench('getDirty (1 field modified)', () => {
    user.name = 'New Name'
    user.getDirty()
  })
})

await run()
