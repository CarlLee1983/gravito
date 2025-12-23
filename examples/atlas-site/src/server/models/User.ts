import { Model, column, HasMany } from '@gravito/atlas'
import Post from './Post.js' // Use .js extension for ESM if needed, or ts-node handles it. Bun handles ts.

export default class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare password: string

  @HasMany(() => Post)
  declare posts: Post[]
}
