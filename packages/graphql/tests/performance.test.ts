import { describe, expect, it } from 'bun:test'
import { defineConfig, GravitoAdapter, PlanetCore } from '@gravito/core'
import { createSchema } from 'graphql-yoga'
import { type GraphQLContext, OrbitGraphQL } from '../src/index'

describe('GraphQL Phase 3 Performance Features', () => {
  it('should cache responses when enabled', async () => {
    let callCount = 0
    const resolvers = {
      Query: {
        time: () => {
          callCount++
          return Date.now().toString()
        },
      },
    }

    const fullSchema = createSchema({
      typeDefs: 'type Query { time: String }',
      resolvers,
    })

    const config = defineConfig({
      orbits: [
        new OrbitGraphQL({
          schema: fullSchema,
          performance: {
            cache: {
              enabled: true,
              ttl: 1000,
            },
          },
        }),
      ],
      adapter: new GravitoAdapter(),
    })

    const core = await PlanetCore.boot(config)
    const { fetch } = core.liftoff()

    // First Call
    const res1 = await fetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ time }' }),
      })
    )
    const json1 = (await res1.json()) as { data: { time: string } }
    expect(callCount).toBe(1)

    // Second Call (Should be cached)
    const res2 = await fetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ time }' }),
      })
    )
    const json2 = (await res2.json()) as { data: { time: string } }

    // Time should be same, callCount should still be 1
    expect(json2.data.time).toBe(json1.data.time)
    expect(callCount).toBe(1)
  })

  it('should support DataLoaders injection', async () => {
    // DataLoader mock
    const mockLoader = {
      load: async (key: string) => `User:${key}`,
    }

    const schema = createSchema({
      typeDefs: 'type Query { user(id: ID!): String }',
      resolvers: {
        Query: {
          user: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
            // biome-ignore lint/suspicious/noExplicitAny: Mock loader
            const loader = context.loaders?.user as any
            return loader.load(id)
          },
        },
      },
    })

    const config = defineConfig({
      orbits: [
        new OrbitGraphQL({
          schema,
          dataLoaders: (_ctx) => ({
            user: mockLoader,
          }),
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
        body: JSON.stringify({ query: '{ user(id: "123") }' }),
      })
    )

    const json = (await res.json()) as { data: { user: string } }
    expect(json.data.user).toBe('User:123')
  })
})
