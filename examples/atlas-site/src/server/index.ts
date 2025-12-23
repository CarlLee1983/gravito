import { Hono } from 'hono'

const app = new Hono()

app.get('/api/demo', (c) => {
  // In a real scenario, this would use DB.table('exoplanets')...
  // Since SQLite driver is not yet available in Atlas kernel, we mock the response
  // to verify the full stack connectivity (Vue -> Vite Proxy -> Hono -> API Response)

  return c.json({
    success: true,
    executed_at: new Date().toISOString(),
    sql: `select * from "exoplanets" where "gravity_g" >= 1.8 order by "distance_ly" asc limit 1`,
    data: {
      id: 42,
      name: 'Kepler-186f',
      gravity_g: 1.82,
      distance_ly: 582,
      type: 'Super-Earth',
      discovered: '2014-04-17',
    },
  })
})

const port = 3000
console.log(`🌌 Atlas Mock Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
