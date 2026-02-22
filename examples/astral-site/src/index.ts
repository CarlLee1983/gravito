import { OrbitAstral } from '@gravito/astral'
import { defineConfig, PlanetCore } from '@gravito/core'
import { UserContract } from './contracts'

const astralOrbit = OrbitAstral.configure({
  title: 'Astral API Docs',
  contracts: [UserContract],
})

const config = defineConfig({
  config: {
    APP_NAME: 'Astral Demo',
    PORT: 3005,
  },
  orbits: [astralOrbit],
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

  if (process.env.BUILD_STATIC_DOCS === 'true') {
    astralOrbit.exportStatic(core, './dist/docs')
    process.exit(0)
  }

  const liftoff = core.liftoff()
  const server = Bun.serve(liftoff as Parameters<typeof Bun.serve>[0])
  console.log(`🚀 Astral Demo running at http://localhost:${server.port}/docs`)
}

main().catch(console.error)
