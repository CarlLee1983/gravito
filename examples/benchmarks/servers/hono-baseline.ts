/**
 * Hono - Baseline Benchmark
 *
 * Simplest possible route: GET /
 * No middleware, no complex logic
 */

import { Hono } from '../../../node_modules/hono/dist/index.js'

const app = new Hono()

// Single static route
app.get('/', (c) => {
  return c.json({ message: 'Hello, World!' })
})

const server = Bun.serve({
  port: 3001,
  fetch: app.fetch,
})

console.log(`Hono running on http://localhost:${server.port}`)
