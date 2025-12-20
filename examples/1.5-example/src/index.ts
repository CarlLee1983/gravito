import { bootstrap } from './bootstrap'

/**
 * 🌌 Gravito Demo Application
 *
 * This is all you need to start a Gravito app!
 * Check out the other files to see how to customize:
 *
 * - routes/     → Add your own routes
 * - hooks/      → Modify behavior with hooks
 * - views/      → HTML templates
 * - bootstrap.ts → Advanced configuration
 */
export default await bootstrap({
  port: parseInt(Bun.env.PORT || '3000', 10),
  name: Bun.env.APP_NAME || 'Gravito Demo',
  version: Bun.env.APP_VERSION || '1.0.0',
})
