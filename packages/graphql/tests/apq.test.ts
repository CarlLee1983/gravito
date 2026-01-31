import { describe, expect, it } from 'bun:test'
import { PlanetCore } from '@gravito/core'
import { createSchema } from 'graphql-yoga'
import { OrbitGraphQL } from '../src'

describe('Automatic Persisted Queries', () => {
  const schema = createSchema({
    typeDefs: 'type Query { ping: String }',
    resolvers: { Query: { ping: () => 'pong' } },
  })

  // SHA256 of "{ ping }"
  const query = '{ ping }'
  const hash = new Bun.CryptoHasher('sha256').update(query).digest('hex')

  it('should handle APQ flow', async () => {
    const core = new PlanetCore()
    const orbit = new OrbitGraphQL({
      schema,
      performance: {
        persistedQueries: {
          enabled: true,
        },
      },
    })
    await core.orbit(orbit)
    const { fetch } = core.liftoff()

    // 1. Send Hash only
    const res1 = await fetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: hash,
            },
          },
        }),
      })
    )

    // biome-ignore lint/suspicious/noExplicitAny: Test response type is dynamic
    const data1 = (await res1.json()) as any
    expect(data1.errors).toBeDefined()
    expect(data1.errors[0].message).toBe('PersistedQueryNotFound')

    // 2. Send Hash + Query
    const res2 = await fetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: hash,
            },
          },
        }),
      })
    )

    // biome-ignore lint/suspicious/noExplicitAny: Test response type is dynamic
    const data2 = (await res2.json()) as any
    if (data2.errors) {
      console.log('DEBUG: APQ Step 2 Errors:', JSON.stringify(data2.errors))
    }
    expect(data2.data?.ping).toBe('pong')

    // 3. Send Hash only (again)
    const res3 = await fetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: hash,
            },
          },
        }),
      })
    )

    // biome-ignore lint/suspicious/noExplicitAny: Test response type is dynamic
    const data3 = (await res3.json()) as any
    expect(data3.data?.ping).toBe('pong')
  })
})
