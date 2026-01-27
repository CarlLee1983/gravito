import { beforeAll, describe, expect, it } from 'bun:test'
import { BelongsTo, DB, HasMany, Model, Schema, SchemaRegistry } from '@gravito/atlas'
import { createYoga } from 'graphql-yoga'
import { createAtlasSchema } from '../src/atlas'
import { createAtlasLoaders } from '../src/dataloaders/atlas-loader'

/**
 * Integration test for automatic DataLoader batching in Atlas relationships.
 * Verifies that the N+1 problem is solved by counting database queries.
 * Uses unique model names and connection to avoid collisions in parallel tests.
 */

class DLPost extends Model {
  static table = 'dl_posts'
  static connection = 'dataloader'
}

class DLUser extends Model {
  static table = 'dl_users'
  static connection = 'dataloader'
  declare posts: DLPost[]
}

HasMany(() => DLPost)(DLUser.prototype, 'posts')
BelongsTo(() => DLUser)(DLPost.prototype, 'user')

describe('Atlas DataLoader Integration', () => {
  beforeAll(async () => {
    if (!DB.getConnectionNames().includes('dataloader')) {
      DB.addConnection('dataloader', {
        driver: 'sqlite',
        database: ':memory:',
      })
    }

    try {
      SchemaRegistry.getInstance()
    } catch {
      SchemaRegistry.init({ mode: 'jit' })
    }

    await Schema.connection('dataloader').create('dl_users', (t) => {
      t.id()
      t.string('name')
    })
    await Schema.connection('dataloader').create('dl_posts', (t) => {
      t.id()
      t.string('title')
      t.integer('dl_user_id')
    })

    const conn = DB.connection('dataloader')
    await conn.table('dl_users').insert([{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }])
    await conn.table('dl_posts').insert([
      { title: 'Post 1', dl_user_id: 1 },
      { title: 'Post 2', dl_user_id: 1 },
      { title: 'Post 3', dl_user_id: 2 },
      { title: 'Post 4', dl_user_id: 3 },
    ])
  })

  it('should solve N+1 problem using automatic DataLoaders', async () => {
    const models = [DLUser, DLPost]
    const schema = await createAtlasSchema({ models })

    const yoga = createYoga({
      schema,
      context: () => ({
        loaders: createAtlasLoaders(models),
      }),
    })

    DB.debug(true)
    DB.clearQueryLog()

    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            dlusers {
              name
              posts {
                title
              }
            }
          }
        `,
      }),
    })

    const result = (await res.json()) as {
      data: { dlusers: { name: string; posts: { title: string }[] }[] }
    }
    expect(result.data.dlusers).toHaveLength(3)
    expect(result.data.dlusers[0].posts).toHaveLength(2)

    const log = DB.getQueryLog()
    const ourLog = log.filter((l) => l.sql.includes('"dl_users"') || l.sql.includes('"dl_posts"'))

    expect(ourLog.length).toBe(2)
    expect(ourLog[0].sql).toContain('SELECT * FROM "dl_users"')
    expect(ourLog[1].sql).toContain('SELECT * FROM "dl_posts" WHERE "dl_user_id" IN')

    DB.debug(false)
  })

  it('should fallback to lazy loading if no DataLoader is provided', async () => {
    const models = [DLUser, DLPost]
    const schema = await createAtlasSchema({ models })

    const yoga = createYoga({ schema })

    DB.debug(true)
    DB.clearQueryLog()

    await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            dlusers {
              posts {
                title
              }
            }
          }
        `,
      }),
    })

    const log = DB.getQueryLog()
    const ourLog = log.filter((l) => l.sql.includes('"dl_users"') || l.sql.includes('"dl_posts"'))

    expect(ourLog.length).toBe(4)

    DB.debug(false)
  })
})
