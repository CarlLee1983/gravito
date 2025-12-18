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
  port: 3000,
  name: 'Gravito Demo',
  version: '1.0.0',
})
