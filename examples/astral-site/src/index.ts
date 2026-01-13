import { OrbitAstral } from '@gravito/astral'
import { defineConfig, PlanetCore } from '@gravito/core'
import { UserContract } from './contracts'

const config = defineConfig({
  config: {
    APP_NAME: 'Astral Demo',
    PORT: 3005,
  },
  orbits: [
    OrbitAstral.configure({
      title: 'Astral API Docs',
      contracts: [UserContract],
    }),
  ],
})

async function main() {
  const core = await PlanetCore.boot(config)
  const router = core.router

  // Implement the actual business logic
  router.get('/api/users', (ctx) => {
    return ctx.json([
      { id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date().toISOString() },
    ])
  })

  router.post('/api/users', (ctx) => {
    return ctx.json({
      id: 2,
      name: 'New User',
      email: 'new@example.com',
      createdAt: new Date().toISOString(),
    })
  })

  await core.liftoff()
  console.log('🚀 Astral Demo running at http://localhost:3005/docs')
}

main().catch(console.error)
