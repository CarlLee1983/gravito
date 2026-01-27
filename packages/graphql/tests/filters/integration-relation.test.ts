import { beforeAll, describe, expect, it } from 'bun:test'
import { BelongsTo, DB, HasMany, Model, Schema, SchemaRegistry } from '@gravito/atlas'
import { createYoga } from 'graphql-yoga'
import { createAtlasSchema } from '../../src/atlas'

// Define models
class Post extends Model {
  static table = 'posts'
  static casts = {
    title: 'string',
  }
}

class User extends Model {
  static table = 'users'
  static casts = {
    name: 'string',
  }
  declare posts: Post[]
}

// Register relationships
HasMany(() => Post)(User.prototype, 'posts')
BelongsTo(() => User)(Post.prototype, 'user')

describe('Relation Filter Integration', () => {
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
      t.timestamps()
    })

    await Schema.create('posts', (t) => {
      t.id()
      t.string('title')
      t.integer('user_id')
      t.timestamps()
    })

    // Populate data
    // User 1: Alice (has post "Hello World")
    await DB.table('users').insert({
      name: 'Alice',
      created_at: new Date(),
      updated_at: new Date(),
    })
    await DB.table('posts').insert({
      title: 'Hello World',
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date(),
    })

    // User 2: Bob (has post "Gravito Rocks")
    await DB.table('users').insert({
      name: 'Bob',
      created_at: new Date(),
      updated_at: new Date(),
    })
    await DB.table('posts').insert({
      title: 'Gravito Rocks',
      user_id: 2,
      created_at: new Date(),
      updated_at: new Date(),
    })

    // User 3: Charlie (no posts)
    await DB.table('users').insert({
      name: 'Charlie',
      created_at: new Date(),
      updated_at: new Date(),
    })
  })

  it('should filter users by post title (where exists)', async () => {
    const schema = await createAtlasSchema({
      models: [User, Post],
    })

    const yoga = createYoga({ schema })

    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            users(where: { posts: { title: { contains: "Gravito" } } }) {
              name
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const result: any = await res.json()
    expect(result.errors).toBeUndefined()
    expect(result.data.users).toHaveLength(1)
    expect(result.data.users[0].name).toBe('Bob')
  })

  it('should filter users who have posts (empty filter object inside relation)', async () => {
    const schema = await createAtlasSchema({
      models: [User, Post],
    })

    const yoga = createYoga({ schema })

    // This effectively checks "where exists posts"
    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            users(where: { posts: {} }) {
              name
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const result: any = await res.json()
    expect(result.errors).toBeUndefined()
    // Alice and Bob have posts
    expect(result.data.users).toHaveLength(2)
    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const names = result.data.users.map((u: any) => u.name).sort()
    expect(names).toEqual(['Alice', 'Bob'])
  })
})
