import { beforeAll, describe, expect, it } from 'bun:test'
import { DB, Model, Schema, SchemaRegistry } from '@gravito/atlas'
import { createYoga } from 'graphql-yoga'
import { createAtlasSchema } from '../src/atlas'

// Define a test model
class User extends Model {
  static table = 'users'
  static casts = {
    active: 'boolean',
    age: 'integer',
  }
}

describe('Atlas Integration', () => {
  beforeAll(async () => {
    // Setup Atlas (In-Memory SQLite)
    DB.addConnection('default', {
      driver: 'sqlite',
      database: ':memory:',
    })

    // Initialize SchemaRegistry in JIT mode
    SchemaRegistry.init({ mode: 'jit' })

    await Schema.create('users', (t) => {
      t.id()
      t.string('name')
      t.integer('age')
      t.boolean('active')
    })

    // Populate data
    await DB.table('users').insert({ name: 'Alice', age: 30, active: true })
    await DB.table('users').insert({ name: 'Bob', age: 25, active: false })
  })

  it('should generate schema from models', async () => {
    const schema = await createAtlasSchema({
      models: [User],
    })

    const yoga = createYoga({ schema })

    // Test Query: List
    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            users {
              id
              name
              age
              active
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const result: any = await res.json()
    expect(result.errors).toBeUndefined()
    expect(result.data.users).toHaveLength(2)
    expect(result.data.users[0].name).toBe('Alice')
    expect(result.data.users[0].age).toBe(30)
    expect(result.data.users[1].active).toBe(false)
  })

  it('should find by id', async () => {
    const schema = await createAtlasSchema({
      models: [User],
    })

    const yoga = createYoga({ schema })

    // Test Query: Get
    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            user(id: 1) {
              name
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const result: any = await res.json()
    expect(result.errors).toBeUndefined()
    expect(result.data.user.name).toBe('Alice')
  })
})
