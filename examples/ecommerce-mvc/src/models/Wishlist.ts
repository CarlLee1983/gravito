import { column, Model } from '@gravito/atlas'

export class Wishlist extends Model {
  static table = 'wishlists'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get user_id(): number {
    return this._attributes.user_id as number
  }
  set user_id(value: number) {
    this._setAttribute('user_id', value)
  }

  @column()
  get product_id(): number {
    return this._attributes.product_id as number
  }
  set product_id(value: number) {
    this._setAttribute('product_id', value)
  }

  @column()
  get created_at(): Date {
    return new Date(this._attributes.created_at as string | number | Date)
  }
  set created_at(value: Date | string) {
    this._setAttribute('created_at', value instanceof Date ? value.toISOString() : value)
  }
}
