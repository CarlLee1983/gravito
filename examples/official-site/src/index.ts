import { bootstrap } from './bootstrap'

/**
 * Gravito Demo Application
 */
const core = await bootstrap({
  port: 3000,
  name: 'Gravito Demo',
  version: '1.0.0',
})

// Predictive Route Warming
if (process.env.NODE_ENV === 'production') {
  await core.warmup(['/', '/features', '/docs', '/releases'])
}

export default core.liftoff()
