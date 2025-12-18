import { Hono } from 'hono'
import { PlanetCore } from './src/PlanetCore'

// 1. Instantiate core
const core = new PlanetCore()

// 2. Hook test: register a Filter
// Assume there is a hook called 'filter_content' that transforms content to uppercase.
core.hooks.addFilter('filter_content', async (content: string) => {
  console.log('[Filter] Transforming content to uppercase...')
  return content.toUpperCase()
})

// 3. Hook test: register an Action
core.hooks.addAction<{ path: string }>('log_access', async ({ path }) => {
  console.log(`[Action] Access logged for: ${path}`)
})

// 4. Create an Orbit (mini Hono app)
const myOrbit = new Hono()

myOrbit.get('/test', async (c) => {
  // Trigger action
  await core.hooks.doAction('log_access', { path: '/api/test' })

  // Raw data
  const originalData = 'hello ecosystem'

  // Apply filter
  const filteredData = await core.hooks.applyFilters('filter_content', originalData)

  return c.json({
    original: originalData,
    filtered: filteredData,
    message: 'Orbit is functioning!',
  })
})

// 5. Mount Orbit
core.mountOrbit('/api', myOrbit)

// 6. Start (liftoff)
export default core.liftoff(3000)
