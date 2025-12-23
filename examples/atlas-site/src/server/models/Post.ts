import { Model, column, BelongsTo } from '@gravito/atlas'
import User from './User.js'

export default class Post extends Model {
  static table = 'posts'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare content: string

  @column()
  declare is_published: boolean

  @column()
  declare user_id: number

  @BelongsTo(() => User)
  declare user: User
}
