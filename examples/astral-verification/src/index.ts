import { OrbitAstral } from '@gravito/astral'
import { defineConfig, PlanetCore } from '@gravito/core'
import { z } from 'zod'
import { AuthContract, RiskyResourceContract, UserContract } from './contracts'

// 1. Configure Astral Orbit
const astralOrbit = OrbitAstral.configure({
  title: 'Astral v1.0 Verification API',
  version: '1.0.0',
  description: 'A reference implementation to verify Astral capabilities before v1.0 release.',
  contracts: [UserContract, AuthContract, RiskyResourceContract],
  components: {
    schemas: {
      GlobalError: z.object({
        message: z.string(),
        code: z.string(),
      }),
    },
  },
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local Development' }],
})

// 2. Define Core Config
const config = defineConfig({
  orbits: [astralOrbit],
})

// 3. Boot Application
const app = await PlanetCore.boot(config)

// 4. Implement Routes (Mocking the behavior defined in contracts)

// Basic CRUD - Users
app.router.get('/users', () =>
  Response.json([
    {
      id: '123',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
  ])
)

app.router.post('/users', () =>
  Response.json(
    {
      id: '456',
      name: 'Bob',
      email: 'bob@example.com',
      role: 'user',
      createdAt: new Date().toISOString(),
    },
    { status: 201 }
  )
)

app.router.get('/users/:id', (ctx) => {
  const { id } = ctx.params
  return Response.json({
    id,
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
    createdAt: new Date().toISOString(),
  })
})

// Auth
app.router.post('/auth/login', () =>
  Response.json({
    accessToken: 'mock-jwt-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
  })
)

app.router.get('/auth/me', () =>
  Response.json({
    id: 'user-1',
    username: 'demo',
    email: 'demo@example.com',
  })
)

// Custom Errors
app.router.get('/risky-items/:id', (ctx) => {
  // Simulate an error
  return Response.json(
    {
      code: 'ITEM_LOCKED',
      message: 'This item is currently locked',
      timestamp: new Date().toISOString(),
    },
    { status: 403 }
  )
})

console.log('🚀 Verification Server running at http://localhost:3000')
console.log('📄 Swagger UI available at http://localhost:3000/docs')
console.log('📝 OpenAPI Spec available at http://localhost:3000/openapi.json')

export default app.liftoff()
