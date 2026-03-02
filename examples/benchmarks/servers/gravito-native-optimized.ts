/**
 * Gravito Native Optimized - Bun 1.39+ Best Practices
 *
 * This benchmark uses serveConfig() to offload routes to Bun's native router.
 */

import { Gravito } from '../../../packages/core/src/engine'

const app = new Gravito()

// 1. Pure static route (Offloaded to Native Router)
app.get('/', (c) => {
  return c.json({ message: 'Hello, World!' })
})

// 2. Route with middleware (Handled by Gravito fetch fallback)
app.get(
  '/slow',
  async (c, next) => {
    const start = performance.now()
    const res = await next()
    const end = performance.now()
    console.log(`Request took ${end - start}ms`)
    return res
  },
  (c) => {
    return c.text('Middleware path')
  }
)

// 3. Dynamic route (Handled by Gravito Radix Tree)
app.get('/users/:id', (c) => {
  return c.json({ id: c.req.param('id') })
})

// Use the new optimized serveConfig
const server = Bun.serve(
  app.serveConfig({
    port: 3001,
    hostname: '0.0.0.0',
  })
)

console.log(`🚀 Gravito Native Optimized running on http://${server.hostname}:${server.port}`)
console.log(`Native routes offloaded: ${Object.keys(app.serveConfig().routes).length}`)
