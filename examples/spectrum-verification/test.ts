import { DB } from '@gravito/atlas'
import { SpectrumOrbit } from '@gravito/spectrum'
import { PlanetCore } from 'gravito-core'

const core = new PlanetCore()

// 1. Configure Atlas
DB.addConnection('default', {
  driver: 'sqlite',
  database: ':memory:',
})

// 2. Install Spectrum
await core.orbit(new SpectrumOrbit())

// 3. Define some routes
core.router.get('/hello', (c) => {
  core.logger.info('Hello route accessed')
  return c.json({ message: 'world' })
})

core.router.get('/db', async (c) => {
  await DB.raw('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)')
  await DB.table('test').insert({ name: 'Spectrum' })
  const result = await DB.table('test').get()
  return c.json(result)
})

// 4. Simulate requests
console.log('--- Simulating requests ---')

const fetch = core.liftoff(3000).fetch

// Request: /hello
await fetch(new Request('http://localhost/hello'))

// Request: /db
console.log('Requesting /db...')
await fetch(new Request('http://localhost/db'))

// Check spectrum API
console.log('Checking Spectrum API...')
const reqRes = await fetch(new Request('http://localhost/gravito/spectrum/api/requests'))
const requests = await reqRes.json()
console.log('Captured Requests:', requests.length)

const queryRes = await fetch(new Request('http://localhost/gravito/spectrum/api/queries'))
const queries = await queryRes.json()
console.log('Captured Queries:', JSON.stringify(queries, null, 2))

if (queries.length >= 2) {
  console.log('✅ Database query capturing successful!')
} else {
  console.log('❌ Database query capturing failed.')
  process.exit(1)
}
