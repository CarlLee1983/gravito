import { column, Model } from '@gravito/atlas'

export class Product extends Model {
  static table = 'products'

  @column({ isPrimary: true })
  id!: number

  @column()
  name!: string

  @column()
  price!: number

  @column()
  category?: string

  // 自動處理 timestamps (如果在遷移中有定義)
  @column()
  createdAt!: Date
}
