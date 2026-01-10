/**
 * Profiling script for Gravito Engine
 *
 * This will run the server and generate a CPU profile
 */

import { Gravito } from '../../../packages/core/src/engine'

const app = new Gravito()

app.get('/', (c) => {
  return c.json({ message: 'Hello, World!' })
})

console.log('Starting Gravito with profiling...')
console.log('Run: bun --cpu-prof run examples/benchmarks/profile-gravito.ts')
console.log('Then in another terminal: oha -z 10s -c 100 http://localhost:3000/')

const server = Bun.serve({
  port: 3000,
  fetch: app.fetch,
})

console.log(`Server running on http://localhost:${server.port}`)
console.log('Waiting for requests...')
