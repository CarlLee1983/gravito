/**
 * Gravito Engine - Baseline Benchmark
 *
 * Simplest possible route: GET /
 * No middleware, no complex logic
 */

import { Gravito } from '../../../packages/core/src/engine'

const app = new Gravito()

// Single static route
app.get('/', (c) => {
  return c.json({ message: 'Hello, World!' })
})

const server = Bun.serve({
  port: 3000,
  fetch: app.fetch,
})

console.log(`Gravito Engine running on http://localhost:${server.port}`)
