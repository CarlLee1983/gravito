import { describe, expect, it } from 'bun:test'
import { defineConfig, GravitoAdapter, PlanetCore } from '@gravito/core'
import { createSchema } from 'graphql-yoga'
import { OrbitGraphQL } from '../src/index'

describe('GraphQL Edge Cases', () => {
  const schema = createSchema({
    typeDefs: 'type Query { hello: String }',
    resolvers: { Query: { hello: () => 'world' } },
  })

  it('should return 401 when auth is required but missing', async () => {
    const config = defineConfig({
      orbits: [
        new OrbitGraphQL({
          schema,
          requireAuth: true,
        }),
      ],
      adapter: new GravitoAdapter(),
    })

    const core = await PlanetCore.boot(config)
    const { fetch } = core.liftoff()

    const res = await fetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ hello }' }),
      })
    )

    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('should allow request when auth passes', async () => {
    const config = defineConfig({
      orbits: [
        // Middleware Orbit to inject auth
        {
          install(core) {
            core.adapter.use('*', async (c, next) => {
              c.set('auth', {
                check: async () => true,
                user: async () => ({ id: 1 }),
              })
              await next()
            })
          },
        },
        new OrbitGraphQL({
          schema,
          requireAuth: true,
        }),
      ],
      adapter: new GravitoAdapter(),
    })

    const core = await PlanetCore.boot(config)
    const { fetch } = core.liftoff()

    const res = await fetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ hello }' }),
      })
    )

    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { hello: string } }
    expect(json.data.hello).toBe('world')
  })

  it('should use custom onAuthFailure handler', async () => {
    const config = defineConfig({
      orbits: [
        new OrbitGraphQL({
          schema,
          requireAuth: true,
          onAuthFailure: () => new Response('Go away', { status: 403 }),
        }),
      ],
      adapter: new GravitoAdapter(),
    })

    const core = await PlanetCore.boot(config)
    const { fetch } = core.liftoff()

    const res = await fetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ hello }' }),
      })
    )

    expect(res.status).toBe(403)
    expect(await res.text()).toBe('Go away')
  })

  it('should handle malformed queries gracefully', async () => {
    const config = defineConfig({
      orbits: [new OrbitGraphQL({ schema })],
      adapter: new GravitoAdapter(),
    })

    const core = await PlanetCore.boot(config)
    const { fetch } = core.liftoff()

    const res = await fetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ hello' }), // Missing closing brace
      })
    )

    // Yoga returns 400 for parsing errors, or 200 with errors in body
    const validStatuses = [200, 400]
    expect(validStatuses).toContain(res.status)
    const json = (await res.json()) as { errors: { message: string }[] }
    expect(json.errors[0].message).toContain('Syntax Error')
  })

  it('should fail when string schema path does not exist', async () => {
    const orbit = new OrbitGraphQL({
      schema: './non-existent-schema.graphql',
    })

    const config = defineConfig({
      orbits: [orbit],
      adapter: new GravitoAdapter(),
    })

    try {
      await PlanetCore.boot(config)
      expect(true).toBe(false) // Should not reach here
    } catch (e) {
      expect((e as Error).name).toBe('GraphQLConfigError')
      expect((e as Error).message).toContain('Failed to load schema from file')
    }
  })
})
