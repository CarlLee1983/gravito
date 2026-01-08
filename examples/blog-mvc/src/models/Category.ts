import { column, Model } from '@gravito/atlas'

export class Category extends Model {
  static table = 'categories'

  @column({ isPrimary: true })
  id!: number

  @column()
  name!: string

  @column()
  slug!: string

  @column()
  description!: string
}
