import { beforeAll, describe, expect, it } from 'bun:test'
import { DB, Model, Schema, SchemaRegistry } from '@gravito/atlas'
import { createYoga } from 'graphql-yoga'
import { createAtlasSchema } from '../../src/atlas'

class User extends Model {
  static table = 'users'
  static casts = {
    age: 'integer',
  }
}

describe('Federation Integration', () => {
  beforeAll(async () => {
    DB.addConnection('default', {
      driver: 'sqlite',
      database: ':memory:',
    })

    SchemaRegistry.init({ mode: 'jit' })

    await Schema.create('users', (t) => {
      t.id()
      t.string('name')
      t.integer('age')
      t.timestamps()
    })

    await DB.table('users').insert({
      name: 'Alice',
      age: 30,
      created_at: new Date(),
      updated_at: new Date(),
    })
  })

  it('should generate federation directives and types', async () => {
    const schema = await createAtlasSchema({
      models: [User],
      federation: {
        enabled: true,
      },
    })

    const yoga = createYoga({ schema })

    const resService = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            _service {
              sdl
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const resultService: any = await resService.json()
    expect(resultService.errors).toBeUndefined()
    expect(resultService.data._service.sdl).toContain('@key(fields: "id")')
    expect(resultService.data._service.sdl).toContain('union _Entity = User')
  })

  it('should resolve _entities', async () => {
    const schema = await createAtlasSchema({
      models: [User],
      federation: {
        enabled: true,
      },
    })

    const yoga = createYoga({ schema })

    const resEntities = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query ($_representations: [_Any!]!) {
            _entities(representations: $_representations) {
              ... on User {
                id
                name
              }
            }
          }
        `,
        variables: {
          _representations: [{ __typename: 'User', id: 1 }],
        },
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const resultEntities: any = await resEntities.json()
    expect(resultEntities.errors).toBeUndefined()
    expect(resultEntities.data._entities).toHaveLength(1)
    expect(resultEntities.data._entities[0].name).toBe('Alice')
  })
})
