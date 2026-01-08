import { BelongsTo, column, Model } from '@gravito/atlas'
import type { Post } from './Post'

export class Comment extends Model {
  static table = 'comments'

  @column({ isPrimary: true })
  id!: number

  @column()
  post_id!: number

  @column()
  author_name!: string

  @column()
  content!: string

  @column()
  is_approved!: boolean

  @column()
  created_at!: Date

  @column()
  updated_at!: Date
}
