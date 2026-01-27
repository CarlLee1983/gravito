// Mocking internal Atlas function MUST be done before importing atlas.ts
const relationshipsMap = new Map()
// biome-ignore lint/suspicious/noExplicitAny: Mocking internal Atlas function
;(globalThis as any).__G_TEST_RELATIONS_FUNC__ = (model: any) => {
  return relationshipsMap.get(model) || new Map()
}

import { describe, expect, test } from 'bun:test'
import { Model, SchemaRegistry } from '@gravito/atlas'
import { createAtlasSchema } from '../../src/atlas'

class Post extends Model {
  static table = 'posts'
  static primaryKey = 'id'
}

class User extends Model {
  static table = 'users'
  static primaryKey = 'id'
}

describe('Atlas GraphQL Advanced Filtering Integration', () => {
  test('createAtlasSchema generates advanced filter types', async () => {
    // Setup registry manually by manipulating the internal cache for testing
    const registry = SchemaRegistry.getInstance()
    // biome-ignore lint/suspicious/noExplicitAny: Internal access for testing
    const registryAny = registry as any

    registryAny.cache.set('users', {
      table: 'users',
      primaryKey: 'id',
      columns: new Map([
        ['id', { name: 'id', type: 'integer', nullable: false }],
        ['name', { name: 'name', type: 'string', nullable: false }],
      ]),
      capturedAt: Date.now(),
    })

    registryAny.cache.set('posts', {
      table: 'posts',
      primaryKey: 'id',
      columns: new Map([
        ['id', { name: 'id', type: 'integer', nullable: false }],
        ['title', { name: 'title', type: 'string', nullable: false }],
        ['user_id', { name: 'user_id', type: 'integer', nullable: false }],
      ]),
      capturedAt: Date.now(),
    })

    relationshipsMap.set(
      User,
      new Map([
        [
          'posts',
          {
            type: 'hasMany',
            related: () => Post,
            foreignKey: 'user_id',
            localKey: 'id',
          },
        ],
      ])
    )
    relationshipsMap.set(Post, new Map())

    const schema = await createAtlasSchema({
      models: [User, Post],
    })

    const typeMap = schema.getTypeMap()

    // Check UserWhereInput
    // biome-ignore lint/suspicious/noExplicitAny: Internal access for testing
    const userWhereInput = typeMap.UserWhereInput as any
    expect(userWhereInput).toBeDefined()
    const fields = userWhereInput.getFields()

    // Check logical operators
    expect(fields._and).toBeDefined()
    expect(fields._or).toBeDefined()
    expect(fields._not).toBeDefined()

    // Check relational filter
    expect(fields.posts).toBeDefined()
    expect(fields.posts.type.toString()).toBe('PostWhereInput')

    // Check string filter expansion
    // biome-ignore lint/suspicious/noExplicitAny: Internal access for testing
    const stringFilter = typeMap.StringFilter as any
    const stringFields = stringFilter.getFields()
    expect(stringFields.contains).toBeDefined()
    expect(stringFields.startsWith).toBeDefined()
    expect(stringFields.endsWith).toBeDefined()
    expect(stringFields.match).toBeDefined()
  })
})
