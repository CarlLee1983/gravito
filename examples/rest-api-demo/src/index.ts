import { OrbitAstral } from '@gravito/astral'
import { defineConfig, PlanetCore } from '@gravito/core'
import { ProductContract } from './contracts/ProductContract'
import { ProductController } from './controllers/ProductController'

const config = defineConfig({
  orbits: [
    // Register Astral Orbit for Documentation
    OrbitAstral.configure({
      title: 'E-Commerce REST API',
      version: '1.0.0',
      contracts: [ProductContract],
      path: '/docs',
    }),
  ],
})

const app = await PlanetCore.boot(config)

// Register Routes
// The contract is for docs, but we still need to register the actual routes.
// In a full implementation, we might have a helper to bind them automatically,
// but for now, we use standard routing.
app.router.resource('/api/products', ProductController)

export default app.liftoff()
