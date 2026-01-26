import { beforeAll, describe, expect, it } from 'bun:test'
import { BelongsTo, DB, HasMany, Model, Schema, SchemaRegistry } from '@gravito/atlas'
import { createYoga } from 'graphql-yoga'
import { createAtlasSchema } from '../src/atlas'

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
    active: 'boolean',
    age: 'integer',
  }
  declare posts: Post[]
}

// Register relationships
HasMany(() => Post)(User.prototype, 'posts')
BelongsTo(() => User)(Post.prototype, 'user')

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
      t.timestamps()
    })

    await Schema.create('posts', (t) => {
      t.id()
      t.string('title')
      t.integer('user_id')
      t.timestamps()
    })

    // Populate data
    await DB.table('users').insert({
      name: 'Alice',
      age: 30,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await DB.table('users').insert({
      name: 'Bob',
      age: 25,
      active: false,
      created_at: new Date(),
      updated_at: new Date(),
    })

    // Create posts for Alice (ID 1)
    await DB.table('posts').insert({
      title: 'First Post',
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await DB.table('posts').insert({
      title: 'Second Post',
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date(),
    })
  })

  it('should generate schema from models with relationships', async () => {
    const schema = await createAtlasSchema({
      models: [User, Post],
    })

    const yoga = createYoga({ schema })

    // Test Query: Relationship
    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            user(id: 1) {
              name
              posts {
                title
              }
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const result: unknown = await res.json()
    expect(result.errors).toBeUndefined()
    expect(result.data.user.name).toBe('Alice')
    expect(result.data.user.posts).toHaveLength(2)
    expect(result.data.user.posts[0].title).toBe('First Post')
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
    const result: unknown = await res.json()
    expect(result.errors).toBeUndefined()
    expect(result.data.user.name).toBe('Alice')
  })

  it('should create a new user', async () => {
    const schema = await createAtlasSchema({
      models: [User],
    })

    const yoga = createYoga({ schema })

    // Test Mutation: Create
    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation {
            createUser(input: { name: "Charlie", age: 35, active: true }) {
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
    const result: unknown = await res.json()
    expect(result.errors).toBeUndefined()
    expect(result.data.createUser.name).toBe('Charlie')
    expect(result.data.createUser.age).toBe(35)
    expect(result.data.createUser.active).toBe(true)

    // Verify DB
    const user = await DB.table('users').where('name', 'Charlie').first()
    expect(user).toBeDefined()
    expect(user.age).toBe(35)
  })

  it('should update an existing user', async () => {
    const schema = await createAtlasSchema({
      models: [User],
    })

    const yoga = createYoga({ schema })

    // Test Mutation: Update (ID 1 is Alice)
    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation {
            updateUser(id: 1, input: { age: 31 }) {
              id
              name
              age
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const result: unknown = await res.json()
    expect(result.errors).toBeUndefined()
    expect(result.data.updateUser.name).toBe('Alice')
    expect(result.data.updateUser.age).toBe(31)

    // Verify DB
    const user = await DB.table('users').where('id', 1).first()
    expect(user.age).toBe(31)
  })

  it('should delete a user', async () => {
    const schema = await createAtlasSchema({
      models: [User],
    })

    const yoga = createYoga({ schema })

    // Test Mutation: Delete (ID 2 is Bob)
    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation {
            deleteUser(id: 2)
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const result: unknown = await res.json()
    expect(result.errors).toBeUndefined()
    expect(result.data.deleteUser).toBe(true)

    // Verify DB
    const user = await DB.table('users').where('id', 2).first()
    expect(user).toBeNull()
  })

  it('should support pagination and filtering', async () => {
    const schema = await createAtlasSchema({
      models: [User],
    })

    const yoga = createYoga({ schema })

    // Create more users for pagination test
    // Current DB: Alice(1), Charlie(3). Bob(2) was deleted.
    await DB.table('users').insert({
      name: 'Dave',
      age: 40,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await DB.table('users').insert({
      name: 'Eve',
      age: 20,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })

    // Total Users: Alice, Charlie, Dave, Eve (4 users)

    // Test Pagination
    const resPage = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            users(limit: 2, offset: 0) {
              name
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const resultPage: unknown = await resPage.json()
    expect(resultPage.errors).toBeUndefined()
    expect(resultPage.data.users).toHaveLength(2)

    // Test Filtering (active: true)
    const resFilter = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            users(where: { active: { eq: true } }) {
              name
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const resultFilter: unknown = await resFilter.json()
    expect(resultFilter.errors).toBeUndefined()
    // Should be 4 active users
    expect(resultFilter.data.users).toHaveLength(4)
  })

  it('should support advanced filtering and sorting', async () => {
    const schema = await createAtlasSchema({
      models: [User],
    })

    const yoga = createYoga({ schema })

    // DB has Alice(30), Bob(25 - deleted?), Charlie(35), Dave(40), Eve(20)
    // Bob was deleted in previous test? No, 'delete a user' test deleted ID 2 (Bob).
    // So active users: Alice(30), Charlie(35), Dave(40), Eve(20).

    // Test 1: Age > 25 (Alice, Charlie, Dave) -> 3 users
    const resGt = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            users(
              where: { age: { gt: 25 } }
              orderBy: { age: ASC }
            ) {
              name
              age
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const jsonGt: unknown = await resGt.json()
    expect(jsonGt.errors).toBeUndefined()
    expect(jsonGt.data.users).toHaveLength(3)
    // Ordered by Age ASC: Alice(30), Charlie(35), Dave(40)
    expect(jsonGt.data.users[0].name).toBe('Alice')
    expect(jsonGt.data.users[2].name).toBe('Dave')

    // Test 2: Name LIKE "%e%" (Alice, Charlie, Dave, Eve) -> All 4
    // Wait, Alice(e), Charlie(e), Dave(e), Eve(e). All have 'e'.
    // Let's try LIKE "A%" (Alice)
    const resLike = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            users(
              where: { name: { like: "A%" } }
            ) {
              name
            }
          }
        `,
      }),
    })

    // biome-ignore lint/suspicious/noExplicitAny: Test result
    const jsonLike: unknown = await resLike.json()
    expect(jsonLike.errors).toBeUndefined()
    expect(jsonLike.data.users).toHaveLength(1)
    expect(jsonLike.data.users[0].name).toBe('Alice')
  })
})
