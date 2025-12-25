import { beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { DB, Model, ModelRegistry, MorphTo, MorphOne, MorphMany, column } from '../src'
import { PostgresGrammar } from '../src/grammar/PostgresGrammar'
import { QueryBuilder } from '../src/query/QueryBuilder'

// 1. Define Models
class Post extends Model {
    static override table = 'posts'
    @column({ isPrimary: true }) declare id: number
    @column() declare title: string

    @MorphMany(() => Comment, 'commentable')
    declare comments: Comment[]

    @MorphOne(() => Image, 'imageable')
    declare image: Image
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
function createMockConnection(responses: Record<string, any[]>): any {
    const grammar = new PostgresGrammar()
    const mockDriver: any = {
        getDriverName: () => 'postgres',
        connect: async () => { },
        disconnect: async () => { },
        isConnected: () => true,
        query: async (sql: string, bindings: any[] = []) => {
            const tableMatch = sql.match(/FROM "([^"]+)"/)
            const tableName = tableMatch?.[1] ?? ''
            let rows = responses[tableName] ?? []

            // Basic simulation of whereIn
            if (sql.includes('IN ($')) {
                const colMatch = sql.match(/WHERE "([^"]+)" IN/)
                const col = colMatch?.[1] ?? ''
                if (col && bindings.length > 0) {
                    rows = rows.filter((row: any) => bindings.includes(row[col]))
                }
            }

            // Basic simulation of where equality
            if (sql.includes(' = $')) {
                const colMatch = sql.match(/WHERE "([^"]+)" =/)
                const col = colMatch?.[1] ?? ''
                if (col && bindings.length > 0) {
                    rows = rows.filter((row: any) => row[col] === bindings[0])
                }
            }

            return { rows, rowCount: rows.length }
        },
        execute: async () => ({ affectedRows: 0 }),
    }
    const connection: any = {
        getName: () => 'test',
        getDriver: () => mockDriver,
        getConfig: () => ({ driver: 'postgres' }),
        table: (tableName: string) => new QueryBuilder(connection, grammar, tableName),
        raw: async (sql: string, bindings?: any[]) => mockDriver.query(sql, bindings),
        transaction: async (cb: any) => cb(connection),
    }
    return connection
}

describe('Polymorphic Relationships', () => {
    beforeEach(() => {
        // @ts-expect-error
        DB.initialized = true
        ModelRegistry.clear()
        // Explicit register for test
        ModelRegistry.register(Post)
        ModelRegistry.register(Video)
        ModelRegistry.register(Comment)
        ModelRegistry.register(Image)
    })

    it('should lazy load morphTo (Post)', async () => {
        const comment = Comment.hydrate({
            id: 1,
            body: 'Great post!',
            commentable_id: 10,
            commentable_type: 'Post'
        })

        const mockConn = createMockConnection({
            posts: [{ id: 10, title: 'Atlas Rocks' }]
        })
        spyOn(DB, 'connection').mockReturnValue(mockConn)

        // @ts-expect-error - testing lazy load property
        const post = await comment.commentable
        expect(post).toBeInstanceOf(Post)
        expect(post.title).toBe('Atlas Rocks')
    })

    it('should lazy load morphTo (Video)', async () => {
        const comment = Comment.hydrate({
            id: 2,
            body: 'Cool video!',
            commentable_id: 20,
            commentable_type: 'Video'
        })

        const mockConn = createMockConnection({
            videos: [{ id: 20, url: 'http://video.com' }]
        })
        spyOn(DB, 'connection').mockReturnValue(mockConn)

        // @ts-expect-error - testing lazy load property
        const video = await comment.commentable
        expect(video).toBeInstanceOf(Video)
        expect(video.url).toBe('http://video.com')
    })

    it('should eager load morphMany', async () => {
        const responses = {
            posts: [{ id: 10, title: 'Post 1' }],
            comments: [
                { id: 1, body: 'C1', commentable_id: 10, commentable_type: 'Post' },
                { id: 2, body: 'C2', commentable_id: 10, commentable_type: 'Post' }
            ]
        }
        const mockConn = createMockConnection(responses)
        spyOn(DB, 'connection').mockReturnValue(mockConn)

        const posts = await Post.with('comments').get()
        expect(posts[0].comments).toHaveLength(2)
        expect(posts[0].comments[0].body).toBe('C1')
    })

    it('should eager load morphTo across multiple types', async () => {
        const responses = {
            comments: [
                { id: 1, body: 'C1', commentable_id: 10, commentable_type: 'Post' },
                { id: 2, body: 'C2', commentable_id: 20, commentable_type: 'Video' }
            ],
            posts: [{ id: 10, title: 'Post 1' }],
            videos: [{ id: 20, url: 'Video 1' }]
        }
        const mockConn = createMockConnection(responses)
        const querySpy = spyOn(mockConn.getDriver(), 'query')
        spyOn(DB, 'connection').mockReturnValue(mockConn)

        const comments = await Comment.with('commentable').get()

        expect(comments).toHaveLength(2)
        expect(comments[0].commentable).toBeInstanceOf(Post)
        expect(comments[1].commentable).toBeInstanceOf(Video)

        // 1 for comments, 1 for posts, 1 for videos = 3 queries total
        expect(querySpy).toHaveBeenCalledTimes(3)
    })
})
