import { beforeAll, describe, expect, it } from 'bun:test'
import { column, DB, Model, Schema, SchemaRegistry } from '@gravito/atlas'
import { createYoga } from 'graphql-yoga'
import { createAtlasSchema } from '../src/atlas'

/**
 * Integration test for V2.2 roadmap features:
 * - Advanced Scalars (UUID, Email, URL)
 * - Batch Mutations
 */

class V22Model extends Model {
  static table = 'v22_models'
  static timestamps = false

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare uuid: string

  @column()
  declare website: string
}

describe('GraphQL V2.2 Features', () => {
  beforeAll(async () => {
    if (!DB.getConnectionNames().includes('default')) {
      DB.addConnection('default', {
        driver: 'sqlite',
        database: ':memory:',
      })
    }

    try {
      SchemaRegistry.getInstance()
    } catch {
      SchemaRegistry.init({ mode: 'jit' })
    }

    await Schema.create('v22_models', (t) => {
      t.id()
      t.string('name')
      t.string('email')
      t.string('uuid')
      t.string('website')
    })
  })

  it('should support advanced scalars with validation', async () => {
    const models = [V22Model]
    const schema = await createAtlasSchema({ models })
    const yoga = createYoga({ schema })

    const validUUID = '550e8400-e29b-41d4-a716-446655440000'

    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation($input: CreateV22ModelInput!) {
            createV22Model(input: $input) {
              id
              email
              uuid
              website
            }
          }
        `,
        variables: {
          input: {
            name: 'Test',
            email: 'test@example.com',
            uuid: validUUID,
            website: 'https://gravito.dev',
          },
        },
      }),
    })

    const result = (await res.json()) as {
      data: { createV22Model: { email: string; uuid: string; website: string } }
    }
    expect(result.data.createV22Model.email).toBe('test@example.com')
    expect(result.data.createV22Model.uuid).toBe(validUUID)
    // URL scalar might normalize trailing slash
    expect(result.data.createV22Model.website).toContain('https://gravito.dev')

    const resInvalid = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation {
            createV22Model(input: { 
              name: "Fail", 
              email: "invalid-email", 
              uuid: "${validUUID}",
              website: "https://ok.com" 
            }) { id }
          }
        `,
      }),
    })

    const resultInvalid = (await resInvalid.json()) as { errors: { message: string }[] }
    expect(resultInvalid.errors).toBeDefined()
    expect(resultInvalid.errors[0].message).toContain('Invalid email format')
  })

  it('should support batch mutations', async () => {
    const models = [V22Model]
    const schema = await createAtlasSchema({ models })
    const yoga = createYoga({ schema })

    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation {
            createV22ModelBatch(input: [
              { name: "User 1", email: "u1@test.com", uuid: "550e8400-e29b-41d4-a716-446655440001", website: "https://u1.com" },
              { name: "User 2", email: "u2@test.com", uuid: "550e8400-e29b-41d4-a716-446655440002", website: "https://u2.com" }
            ]) {
              id
              name
            }
          }
        `,
      }),
    })

    const result = (await res.json()) as { data: { createV22ModelBatch: { name: string }[] } }
    expect(result.data.createV22ModelBatch).toHaveLength(2)
    expect(result.data.createV22ModelBatch[0].name).toBe('User 1')
    expect(result.data.createV22ModelBatch[1].name).toBe('User 2')

    const count = await V22Model.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })
})
