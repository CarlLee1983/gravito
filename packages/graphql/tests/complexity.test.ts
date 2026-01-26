import { describe, expect, it } from 'bun:test'
import { PlanetCore } from '@gravito/core'
import { createSchema } from 'graphql-yoga'
import { OrbitGraphQL } from '../src'

describe('GraphQL Query Complexity', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        simple: String
        complex: String
        nested: Nested
      }
      type Nested {
        field: String
      }
    `,
    resolvers: {
      Query: {
        simple: () => 'simple',
        complex: () => 'complex',
        nested: () => ({ field: 'nested' }),
      },
    },
  })

  it('should allow queries within complexity limit', async () => {
    const core = new PlanetCore()
    const orbit = new OrbitGraphQL({
      schema,
      security: {
        complexityLimit: 5,
      },
    })
    await core.orbit(orbit)
    const { fetch } = core.liftoff()

    const res = await fetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ simple }', // Complexity: 1
        }),
      })
    )

    expect(res.status).toBe(200)
    const data = (await res.json()) as { data: { simple: string }; errors: unknown[] }
    expect(data.data).toEqual({ simple: 'simple' })
    expect(data.errors).toBeUndefined()
  })

  it('should reject queries exceeding complexity limit', async () => {
    const core = new PlanetCore()
    const orbit = new OrbitGraphQL({
      schema,
      security: {
        complexityLimit: 1, // Limit is 1
      },
    })
    await core.orbit(orbit)
    const { fetch } = core.liftoff()

    const res = await fetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ simple complex }', // Complexity: 2 (1 for simple + 1 for complex)
        }),
      })
    )

    const data = (await res.json()) as { errors: { message: string }[] }
    console.log('DEBUG: Response data', JSON.stringify(data))
    expect(data.errors).toBeDefined()
    expect(data.errors[0].message).toMatch(/complexity/i)
  })
})
