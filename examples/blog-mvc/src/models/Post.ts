import { BelongsTo, column, HasMany, Model } from '@gravito/atlas'
import { Category } from './Category'
import { Comment } from './Comment'

export class Post extends Model {
  static table = 'posts'

  @column({ isPrimary: true })
  id!: number

  @column()
  category_id!: number

  @column()
  slug!: string

  @column()
  title!: string

  @column()
  excerpt!: string

  @column()
  content!: string

  @column()
  author!: string

  @column()
  status!: string

  @column()
  feature_image!: string

  @column()
  published_at!: Date

  @column()
  created_at!: Date

  @column()
  updated_at!: Date

  @BelongsTo(() => Category, { foreignKey: 'category_id' })
  category!: Category

  @HasMany(() => Comment, { foreignKey: 'post_id' })
  comments!: Comment[]
}
