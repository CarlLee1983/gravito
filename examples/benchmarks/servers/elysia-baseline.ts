/**
 * Elysia - Baseline Benchmark
 *
 * Simplest possible route: GET /
 * No middleware, no complex logic
 */

import { Elysia } from '../../../node_modules/elysia/dist/index.js'

const app = new Elysia()

// Single static route
app.get('/', () => {
  return { message: 'Hello, World!' }
})

app.listen(3002)

console.log(`Elysia running on http://localhost:3002`)
