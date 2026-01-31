import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { DB } from '../src/DB'
import { PostgresGrammar } from '../src/grammar/PostgresGrammar'
import { column } from '../src/orm/model/decorators'
import { Model } from '../src/orm/model/Model'
import { MorphMany, MorphTo } from '../src/orm/model/relationships'
import { QueryBuilder } from '../src/query/QueryBuilder'
import type { ConnectionContract, ExecuteResult } from '../src/types'

// 1. Define Models
class Post extends Model {
  static override table = 'posts'
  @column({ isPrimary: true }) declare id: number
  @column() declare title: string

  @MorphMany(() => Comment, 'commentable')
  declare comments: Comment[]
}

class Video extends Model {
  static override table = 'videos'
  @column({ isPrimary: true }) declare id: number
  @column() declare url: string

  @MorphMany(() => Comment, 'commentable')
  declare comments: Comment[]
}

class Comment extends Model {
  static override table = 'comments'
  @column({ isPrimary: true }) declare id: number
  @column() declare body: string
  @column() declare commentable_id: number
  @column() declare commentable_type: string

  @MorphTo()
  declare commentable: Post | Video
}

class Image extends Model {
  static override table = 'images'
  @column({ isPrimary: true }) declare id: number
  @column() declare url: string
  @column() declare imageable_id: number
  @column() declare imageable_type: string

  @MorphTo()
  declare imageable: Post
}

// 2. Mocking logic
function createMockConnection(responses: Record<string, any[]>) {
  const grammar = new PostgresGrammar()
  const mockDriver: any = {
    getDriverName: () => 'mock',
    connect: async () => undefined,
    disconnect: async () => undefined,
    isConnected: () => true,
    query: async (sql: string, _bindings?: unknown[]) => {
      const tableMatch = sql.match(/FROM "([^"]+)"/)
      const tableName = tableMatch?.[1] ?? ''
      const rows = responses[tableName] ?? []
      return { rows, rowCount: rows.length }
    },
    execute: async (): Promise<ExecuteResult> => ({ affectedRows: 0 }),
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => undefined,
    inTransaction: () => false,
  }

  let connection: ConnectionContract

  connection = {
    getName: () => 'test',
    getDriver: () => mockDriver,
    getConfig: () => ({ driver: 'postgres' }),
    getGrammar: () => grammar,
    table: (tableName: string) => new QueryBuilder(connection, grammar, tableName),
    raw: async (sql: string, bindings?: unknown[]) => mockDriver.query(sql, bindings),
    execute: async (sql: string, bindings?: unknown[]) => mockDriver.execute(sql, bindings),
    transaction: async <T>(cb: (conn: ConnectionContract) => Promise<T>) => cb(connection),
    disconnect: async () => undefined,
    getTracer: () => undefined,
  }

  return connection
}

describe('Polymorphic Relationships', () => {
  const TEST_CONN = `poly_test_${Math.random().toString(36).slice(2)}`
  let connectionSpy: any

  beforeEach(() => {
    // @ts-expect-error
    DB.initialized = true
    Image.connection = TEST_CONN
    Post.connection = TEST_CONN
    Video.connection = TEST_CONN
    Comment.connection = TEST_CONN
  })

  afterEach(() => {
    if (connectionSpy) {
      connectionSpy.mockRestore()
      connectionSpy = null
    }
    Image.connection = undefined
    Post.connection = undefined
    Video.connection = undefined
    Comment.connection = undefined
  })

  it('should lazy load morphTo (Post)', async () => {
    const responses: any = {
      images: [{ id: 1, imageable_id: 10, imageable_type: 'Post' }],
      posts: [{ id: 10, title: 'Morph Post' }],
    }
    const mockConn = createMockConnection(responses)

    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) {
        return mockConn
      }
      return originalConnection.call(DB, name as any)
    })

    const image = Image.hydrate<Image>(responses.images[0])
    const imageable = await image.imageable

    expect(imageable).toBeInstanceOf(Post)
    expect(imageable.title).toBe('Morph Post')
  })

  it('should lazy load morphTo (Video)', async () => {
    const responses: any = {
      comments: [{ id: 1, body: 'Cool', commentable_id: 20, commentable_type: 'Video' }],
      videos: [{ id: 20, url: 'http://video.com' }],
    }
    const mockConn = createMockConnection(responses)

    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) {
        return mockConn
      }
      return originalConnection.call(DB, name as any)
    })

    const comment = Comment.hydrate<Comment>(responses.comments[0])
    const commentable = await comment.commentable

    expect(commentable).toBeInstanceOf(Video)
    expect(commentable.url).toBe('http://video.com')
  })

  it('should eager load morphMany', async () => {
    const responses: any = {
      posts: [{ id: 1, title: 'Post 1' }],
      comments: [
        { id: 100, body: 'C1', commentable_id: 1, commentable_type: 'Post' },
        { id: 101, body: 'C2', commentable_id: 1, commentable_type: 'Post' },
      ],
    }
    const mockConn = createMockConnection(responses)

    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) {
        return mockConn
      }
      return originalConnection.call(DB, name as any)
    })

    const posts = await Post.with('comments').get()
    expect(posts[0].comments).toHaveLength(2)
    expect(posts[0].comments[0]).toBeInstanceOf(Comment)
  })

  it('should eager load morphTo across multiple types', async () => {
    const responses: any = {
      comments: [
        { id: 1, body: 'C1', commentable_id: 10, commentable_type: 'Post' },
        { id: 2, body: 'C2', commentable_id: 20, commentable_type: 'Video' },
      ],
      posts: [{ id: 10, title: 'Post 10' }],
      videos: [{ id: 20, url: 'Video 20' }],
    }
    const mockConn = createMockConnection(responses)

    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) {
        return mockConn
      }
      return originalConnection.call(DB, name as any)
    })

    const comments = await Comment.with('commentable').get()
    expect(comments).toHaveLength(2)
    expect(comments[0].commentable).toBeInstanceOf(Post)
    expect(comments[1].commentable).toBeInstanceOf(Video)
  })
})
