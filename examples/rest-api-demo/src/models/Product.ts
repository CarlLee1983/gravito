import { Model } from '@gravito/atlas'

export class Product extends Model {
  static table = 'products'

  declare id: number
  declare name: string
  declare price: number
  declare description: string | null
  declare stock: number
}
