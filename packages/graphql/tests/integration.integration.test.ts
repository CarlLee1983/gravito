import { describe, expect, it } from 'bun:test'
import { defineConfig, PlanetCore } from '@gravito/core'
import { GravitoAdapter } from '@gravito/photon/adapter'
import { createSchema } from 'graphql-yoga'
import { type GraphQLContext, OrbitGraphQL } from '../src/index'

describe('GraphQL Integration', () => {
  it('should serve GraphQL playground/queries via PlanetCore', async () => {
    // 1. Setup PlanetCore with GraphQL Orbit
    const config = defineConfig({
      config: {
        APP_NAME: 'TestApp',
        PORT: 0, // Random port
      },
      orbits: [
        new OrbitGraphQL(), // Default Hello World schema
      ],
      adapter: new GravitoAdapter(),
    })

    const core = await PlanetCore.boot(config)
    const { fetch } = core.liftoff()

    // 2. Send a GraphQL Query
    const query = '{ hello, gravito }'
    const request = new Request('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    const response = await fetch(request)
    const result = (await response.json()) as { data: { hello: string; gravito: string } }

    // 3. Verify Results
    expect(response.status).toBe(200)
    expect(result.data.hello).toBe('Hello World from Gravito GraphQL!')
    expect(result.data.gravito).toBe('Is awesome 🚀')
  })

  it('should support custom schema provided via container', async () => {
    const customSchema = createSchema({
      typeDefs: 'type Query { ping: String }',
      resolvers: { Query: { ping: () => 'pong' } },
    })

    const config = defineConfig({
      config: {
        GRAPHQL_SCHEMA: customSchema,
      },
      orbits: [OrbitGraphQL],
      adapter: new GravitoAdapter(),
    })

    const core = await PlanetCore.boot(config)
    const { fetch } = core.liftoff()

    const request = new Request('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ ping }' }),
    })

    const response = await fetch(request)
    const result = (await response.json()) as { data: { ping: string } }

    expect(result.data.ping).toBe('pong')
  })

  it('should inject GravitoContext into resolvers', async () => {
    const customSchema = createSchema({
      typeDefs: 'type Query { userAgent: String }',
      resolvers: {
        Query: {
          userAgent: (_: unknown, __: unknown, context: GraphQLContext) => {
            return context.gravito.req.header('User-Agent')
          },
        },
      },
    })

    const config = defineConfig({
      config: { GRAPHQL_SCHEMA: customSchema },
      orbits: [OrbitGraphQL],
      adapter: new GravitoAdapter(),
    })

    const core = await PlanetCore.boot(config)
    const { fetch } = core.liftoff()

    const request = new Request('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Gravito-Test-Agent',
      },
      body: JSON.stringify({ query: '{ userAgent }' }),
    })

    const response = await fetch(request)
    const result = (await response.json()) as { data: { userAgent: string } }

    expect(result.data.userAgent).toBe('Gravito-Test-Agent')
  })

  it('should support custom endpoint path', async () => {
    const config = defineConfig({
      orbits: [new OrbitGraphQL({ path: '/api/gql' })],
      adapter: new GravitoAdapter(),
    })

    const core = await PlanetCore.boot(config)
    const { fetch } = core.liftoff()

    // 1. Check default path (should be 404)
    const reqDefault = new Request('http://localhost/graphql', { method: 'POST' })
    const resDefault = await fetch(reqDefault)
    expect(resDefault.status).toBe(404)

    // 2. Check custom path (should be 200)
    const reqCustom = new Request('http://localhost/api/gql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ hello }' }),
    })
    const resCustom = await fetch(reqCustom)
    expect(resCustom.status).toBe(200)
  })

  it('should resolve schema from container binding (Service Provider pattern)', async () => {
    // Simulate a user binding the schema manually in a provider or before boot
    const customSchema = createSchema({
      typeDefs: 'type Query { version: String }',
      resolvers: { Query: { version: () => '1.0.0' } },
    })

    const config = defineConfig({
      orbits: [OrbitGraphQL],
      adapter: new GravitoAdapter(),
    })

    const core = new PlanetCore(config) // Manual init to access container
    core.container.instance('GRAPHQL_SCHEMA', customSchema)

    await core.bootstrap() // Standard boot process (calls orbit.install)

    // Note: In PlanetCore.boot(), it does new PlanetCore -> orbit.install -> boot.
    // Here we need to manually invoke orbit install since we created core manually.
    const orbit = new OrbitGraphQL()
    await orbit.install(core)

    const { fetch } = core.liftoff()

    const request = new Request('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ version }' }),
    })

    const response = await fetch(request)
    const result = (await response.json()) as { data: { version: string } }

    expect(result.data.version).toBe('1.0.0')
  })
})
