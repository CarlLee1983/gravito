/**
 * Simple example demonstrating the Gravito Engine
 *
 * Run with: bun run examples/engine-simple.ts
 */

import { Gravito } from '../packages/core/src/engine'

const app = new Gravito()

// Simple routes
app.get('/', (c) => {
  return c.json({ message: 'Hello from Gravito Engine!' })
})

app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ userId: id })
})

app.post('/users', async (c) => {
  const body = await c.req.json()
  return c.json({ created: body }, 201)
})

// Global middleware
app.use(async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`)
  await next()
})

// Path-based middleware
app.use('/api/*', async (c, next) => {
  c.header('X-API-Version', '1.0')
  await next()
})

app.get('/api/status', (c) => {
  return c.json({ status: 'ok', version: '1.0' })
})

// Error handling
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({ error: err.message }, 500)
})

app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404)
})

// Start server
const server = Bun.serve({
  port: 3000,
  fetch: app.fetch,
})

console.log(`🚀 Gravito Engine running at http://localhost:${server.port}`)
console.log('\nTry these routes:')
console.log('  GET  http://localhost:3000/')
console.log('  GET  http://localhost:3000/users/123')
console.log('  POST http://localhost:3000/users')
console.log('  GET  http://localhost:3000/api/status')
