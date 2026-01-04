import { bootstrap } from './bootstrap'

/**
 * 🌌 Gravito Static Site
 *
 * Entry point for the application.
 * In development mode, this starts the server.
 * In production, this is used for static site generation.
 */
const core = await bootstrap({
  port: Number(process.env.PORT) || 3001,
  name: process.env.APP_NAME || 'Gravito Static Site',
  version: process.env.APP_VERSION || '1.0.0',
})

// For static site, we typically don't start the server in production
// But we can start it for development/testing
// Export the liftoff config for Bun.serve to use
// Bun will automatically start the server when this file is run
export default core.liftoff()
