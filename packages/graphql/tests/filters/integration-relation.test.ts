import { beforeAll, describe, expect, it } from 'bun:test'
import { BelongsTo, DB, HasMany, Model, Schema, SchemaRegistry } from '@gravito/atlas'
import { createYoga } from 'graphql-yoga'
import { createAtlasSchema } from '../../src/atlas'

class RelPost extends Model {
  static table = 'posts'
  static connection = 'filt_rel'
  static casts = {
    title: 'string',
  }
}

class RelUser extends Model {
  static table = 'users'
  static connection = 'filt_rel'
  static casts = {
    name: 'string',
  }
  declare posts: RelPost[]
}

HasMany(() => RelPost)(RelUser.prototype, 'posts')
BelongsTo(() => RelUser)(RelPost.prototype, 'user')

describe('Relation Filter Integration', () => {
  beforeAll(async () => {
    if ((globalThis as unknown as Record<string, unknown>).__G_TEST_RELATIONS_FUNC__) {
      ;(globalThis as unknown as Record<string, unknown>).__G_TEST_RELATIONS_FUNC__ = undefined
    }

    if (!DB.getConnectionNames().includes('filt_rel')) {
      DB.addConnection('filt_rel', {
        driver: 'sqlite',
        database: ':memory:',
      })
    }

    try {
      SchemaRegistry.getInstance()
    } catch {
      SchemaRegistry.init({ mode: 'jit' })
    }

    await Schema.connection('filt_rel').create('users', (t) => {
      t.id()
      t.string('name')
      t.timestamps()
    })

    await Schema.connection('filt_rel').create('posts', (t) => {
      t.id()
      t.string('title')
      t.integer('user_id')
      t.timestamps()
    })

    await DB.connection('filt_rel').table('users').insert({
      name: 'Alice',
      created_at: new Date(),
      updated_at: new Date(),
    })
    await DB.connection('filt_rel').table('posts').insert({
      title: 'Hello World',
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date(),
    })

    await DB.connection('filt_rel').table('users').insert({
      name: 'Bob',
      created_at: new Date(),
      updated_at: new Date(),
    })
    await DB.connection('filt_rel').table('posts').insert({
      title: 'Gravito Rocks',
      user_id: 2,
      created_at: new Date(),
      updated_at: new Date(),
    })

    await DB.connection('filt_rel').table('users').insert({
      name: 'Charlie',
      created_at: new Date(),
      updated_at: new Date(),
    })
  })

  it('should filter users by post title (where exists)', async () => {
    const schema = await createAtlasSchema({
      models: [RelUser, RelPost],
    })

    const yoga = createYoga({ schema })

    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            relusers(where: { posts: { title: { contains: "Gravito" } } }) {
              name
            }
          }
        `,
      }),
    })

    const result = (await res.json()) as {
      data: { relusers: { name: string }[] }
      errors?: unknown[]
    }
    expect(result.errors).toBeUndefined()
    expect(result.data.relusers).toHaveLength(1)
    expect(result.data.relusers[0].name).toBe('Bob')
  })

  it('should filter users who have posts (empty filter object inside relation)', async () => {
    const schema = await createAtlasSchema({
      models: [RelUser, RelPost],
    })

    const yoga = createYoga({ schema })

    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            relusers(where: { posts: {} }) {
              name
            }
          }
        `,
      }),
    })

    const result = (await res.json()) as {
      data: { relusers: { name: string }[] }
      errors?: unknown[]
    }
    expect(result.errors).toBeUndefined()
    expect(result.data.relusers).toHaveLength(2)
    const names = result.data.relusers.map((u) => u.name).sort()
    expect(names).toEqual(['Alice', 'Bob'])
  })
})
