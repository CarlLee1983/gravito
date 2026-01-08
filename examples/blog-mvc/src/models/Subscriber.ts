import { column, Model } from '@gravito/atlas'

export class Subscriber extends Model {
  static table = 'subscribers'

  @column({ isPrimary: true })
  id!: number

  @column()
  email!: string

  @column()
  created_at!: Date

  @column()
  updated_at!: Date
}
