import { beforeAll, describe, expect, it } from 'bun:test'
import { DB, Model, Schema, SchemaRegistry } from '@gravito/atlas'
import { createYoga } from 'graphql-yoga'
import { createAtlasSchema } from '../../src/atlas'

class User extends Model {
  static table = 'users'
  static connection = 'pag_int'
  static casts = {
    age: 'integer',
  }
}

describe('Pagination Integration', () => {
  beforeAll(async () => {
    if (!DB.getConnectionNames().includes('pag_int')) {
      DB.addConnection('pag_int', {
        driver: 'sqlite',
        database: ':memory:',
      })
    }

    try {
      SchemaRegistry.getInstance()
    } catch {
      SchemaRegistry.init({ mode: 'jit' })
    }

    await Schema.connection('pag_int').create('users', (t) => {
      t.id()
      t.string('name')
      t.integer('age')
      t.timestamps()
    })

    // Insert 15 users
    for (let i = 1; i <= 15; i++) {
      await DB.connection('pag_int')
        .table('users')
        .insert({
          name: `User ${i}`,
          age: 20 + i,
          created_at: new Date(),
          updated_at: new Date(),
        })
    }
  })

  it('should support forward pagination (first/after)', async () => {
    const schema = await createAtlasSchema({
      models: [User],
    })

    const yoga = createYoga({ schema })

    // First 5
    const res1 = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            userConnection(first: 5) {
              edges {
                node {
                  name
                }
                cursor
              }
              pageInfo {
                hasNextPage
                endCursor
              }
              totalCount
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const result1: any = await res1.json()
    expect(result1.errors).toBeUndefined()
    expect(result1.data.userConnection.edges).toHaveLength(5)
    expect(result1.data.userConnection.totalCount).toBe(15)
    expect(result1.data.userConnection.pageInfo.hasNextPage).toBe(true)

    const cursor = result1.data.userConnection.pageInfo.endCursor

    // Next 5
    const res2 = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query($cursor: String) {
            userConnection(first: 5, after: $cursor) {
              edges {
                node {
                  name
                }
              }
              pageInfo {
                hasNextPage
              }
            }
          }
        `,
        variables: { cursor },
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const result2: any = await res2.json()
    expect(result2.errors).toBeUndefined()
    expect(result2.data.userConnection.edges).toHaveLength(5)
    expect(result2.data.userConnection.edges[0].node.name).toBe('User 6')
  })

  it('should support backward pagination (last/before)', async () => {
    const schema = await createAtlasSchema({
      models: [User],
    })

    const yoga = createYoga({ schema })

    // Last 5
    const res1 = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            userConnection(last: 5) {
              edges {
                node {
                  name
                }
              }
              pageInfo {
                hasPreviousPage
                startCursor
              }
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const result1: any = await res1.json()
    expect(result1.errors).toBeUndefined()
    expect(result1.data.userConnection.edges).toHaveLength(5)
    // User 11 to User 15
    expect(result1.data.userConnection.edges[4].node.name).toBe('User 15')
  })
})
