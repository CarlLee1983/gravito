import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig, GravitoAdapter, PlanetCore } from '@gravito/core'
import { buildSchema } from 'graphql'
import { OrbitGraphQL } from '../src/index'

describe('GraphQL Phase 2 Features', () => {
  const schemaPath = join(import.meta.dir, 'fixtures', 'schema.graphql')

  beforeAll(async () => {
    // Ensure fixture directory exists
    await Bun.write(schemaPath, 'type Query { hello: String }')
  })

  afterAll(async () => {
    const fixtureFile = Bun.file(schemaPath)
    if (await fixtureFile.exists()) {
      await unlink(schemaPath)
    }
  })

  it('should support Query Depth Limit', async () => {
    // Create nested schema for depth testing
    const schema = buildSchema(`
      type Query {
        me: User
      }
      type User {
        id: ID
        friend: User
      }
    `)

    const depthConfig = defineConfig({
      orbits: [
        new OrbitGraphQL({
          schema,
          security: { depthLimit: 1 },
        }),
      ],
      adapter: new GravitoAdapter(),
    })

    const depthCore = await PlanetCore.boot(depthConfig)
    const { fetch: depthFetch } = depthCore.liftoff()

    // Shallow Query should pass
    const resShallow = await depthFetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ me { id } }' }),
      })
    )
    expect(resShallow.status).toBe(200)

    // Deep Query should fail
    const resDeep = await depthFetch(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ me { friend { id } } }' }),
      })
    )

    const jsonDeep = (await resDeep.json()) as { errors: Array<{ message: string }> }
    expect(jsonDeep.errors).toBeDefined()
    expect(jsonDeep.errors[0].message).toContain('exceeds maximum operation depth of 1')
  })

  it('should load schema from file using Bun.file', async () => {
    const config = defineConfig({
      orbits: [
        new OrbitGraphQL({
          schema: schemaPath,
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

    const json = (await res.json()) as { data: { hello: string } }
    expect(json.data.hello).toBe('Hello World')
  })
})
