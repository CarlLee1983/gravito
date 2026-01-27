import { QuasarAgent } from '@gravito/quasar'
import { HealthServer } from '@gravito/quasar/health'
import express from 'express'

/**
 * Express Integration Example
 *
 * This example shows how to run Quasar alongside an Express application
 * and expose a health check endpoint for Kubernetes.
 */
async function run() {
  const app = express()
  const port = 3000

  // 1. Initialize Quasar Agent
  const agent = new QuasarAgent({
    service: 'api-gateway',
    transport: { url: 'redis://localhost:6379' },
  })

  await agent.start()

  // 2. Start Quasar Health Server (separate port for security/K8s)
  const healthServer = new HealthServer(agent, 9999)
  await healthServer.start()
  console.log('Quasar Health Server running on http://localhost:9999/health')

  app.get('/', (req, res) => {
    res.json({ message: 'Hello World' })
  })

  app.get('/status', (req, res) => {
    // 3. You can also expose Quasar status via your own API
    res.json(agent.getStatus())
  })

  app.listen(port, () => {
    console.log(`Express app listening on http://localhost:${port}`)
  })
}

run().catch(console.error)
