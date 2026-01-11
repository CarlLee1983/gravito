import { describe, expect, it } from 'bun:test'
import { defineConfig, GravitoAdapter, PlanetCore } from '@gravito/core'
import { createSchema } from 'graphql-yoga'
import { OrbitGraphQL } from '../src/index'

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
    const result = (await response.json()) as any

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
    const result = (await response.json()) as any

    expect(result.data.ping).toBe('pong')
  })
})
