import { describe, test, expect } from 'bun:test'
import { Model } from '../src/orm/model/Model'

describe('Serialization', () => {
    class User extends Model {
        static override table = 'users'
        declare id: number
        declare username: string
        declare password: string
        declare is_admin: boolean
        declare full_name: string

        static override hidden = ['password']

        static override appends = ['full_name']

        getFullNameAttribute() {
            return `User: ${this.username}`
        }
    }

    test('it hides attributes in toJSON', () => {
        const user = User.hydrate<User>({
            id: 1,
            username: 'carl',
            password: 'secret_hash',
            is_admin: true
        })

        const json = user.toJSON()

        expect(json.id).toBe(1)
        expect(json.username).toBe('carl')
        expect(json.password).toBeUndefined()
    })

    test('it appends virtual attributes in toJSON', () => {
        const user = User.hydrate<User>({
            id: 1,
            username: 'carl',
            password: 'secret_hash'
        })

        const json = user.toJSON()

        expect(json.full_name).toBe('User: carl')
    })

    test('it serializes relations if present', () => {
        // Needs relationship setup or manual assignment
        const user = User.hydrate<User>({ id: 1, username: 'carl' })
        const post = new User() // Just mocking a related model
        post.username = 'post_author'

            // Manual assignment simulating eager load
            ; (user as any).posts = [post]

        // We expect toJSON to perform a "deep" scan for attached models?
        // Or should we expliclty define 'with' properties?
        // Laravel includes relations automatically if they are loaded.

        const json = user.toJSON()
        expect(json.posts).toBeDefined()
        expect(json.posts[0].username).toBe('post_author')
    })
})
