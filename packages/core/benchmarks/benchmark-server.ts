import { PhotonAdapter } from '../src/adapters/PhotonAdapter'
import { Gravito } from '../src/engine/Gravito'
import type { FastContext } from '../src/engine/types'

const app = new Gravito()

// 1. Health check (MinimalContext, no middleware)
app.get('/health', (c: FastContext) => c.text('ok'))

// 2. Static route with FastContext (middleware triggers FastContext)
app.get(
  '/api/status',
  (async (c: FastContext, next: any) => {
    await next()
  }) as any,
  (c: FastContext) => c.json({ status: 'ok' })
)

// 3. Dynamic route
app.get('/api/users/:id', (c: FastContext) => {
  const id = c.req.param('id')
  return c.json({ id })
})

// 4. Route with 3 middleware
const m = async (_c: FastContext, next: any) => {
  await next()
}
app.get('/api/protected/resource', m as any, m as any, m as any, (c: FastContext) =>
  c.json({ data: 'resource' })
)

// 5. PhotonAdapter path
const adapter = new PhotonAdapter()
adapter.route('get', '/users', (c: any) => c.json({ users: [] }))
app.get('/photon/users', (c: FastContext) => adapter.fetch(c.req.raw))

console.log('Benchmark server listening on http://localhost:3000')

export default {
  port: 3000,
  fetch: app.fetch,
}
