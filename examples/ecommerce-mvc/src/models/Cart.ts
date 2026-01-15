import { column, Model } from '@gravito/atlas'

/**
 * Cart Model
 *
 * Shopping cart for users or guest sessions.
 */
export class Cart extends Model {
  static table = 'carts'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  /**
   * User ID (null for guest carts)
   */
  @column()
  get user_id(): number | null {
    return (this._attributes.user_id as number) || null
  }
  set user_id(value: number | null) {
    this._setAttribute('user_id', value)
  }

  /**
   * Session ID for guest carts
   */
  @column()
  get session_id(): string | null {
    return (this._attributes.session_id as string) || null
  }
  set session_id(value: string | null) {
    this._setAttribute('session_id', value)
  }

  @column()
  get created_at(): Date {
    return new Date(this._attributes.created_at as string | number | Date)
  }
  set created_at(value: Date | string) {
    this._setAttribute('created_at', value instanceof Date ? value.toISOString() : value)
  }

  @column()
  get updated_at(): Date {
    return new Date(this._attributes.updated_at as string | number | Date)
  }
  set updated_at(value: Date | string) {
    this._setAttribute('updated_at', value instanceof Date ? value.toISOString() : value)
  }

  // ─────────────────────────────────────────────────────────────
  // Relationship Data (loaded via service)
  // ─────────────────────────────────────────────────────────────

  items?: CartItem[]

  /**
   * Get total item count
   */
  getItemCount(): number {
    if (!this.items) {
      return 0
    }
    return this.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  /**
   * Get subtotal (in smallest currency unit)
   */
  getSubtotal(): number {
    if (!this.items) {
      return 0
    }
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }
}

/**
 * CartItem Model
 *
 * Individual item in a shopping cart.
 */
export class CartItem extends Model {
  static table = 'cart_items'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get cart_id(): number {
    return this._attributes.cart_id as number
  }
  set cart_id(value: number) {
    this._setAttribute('cart_id', value)
  }

  @column()
  get product_id(): number {
    return this._attributes.product_id as number
  }
  set product_id(value: number) {
    this._setAttribute('product_id', value)
  }

  @column()
  get quantity(): number {
    return this._attributes.quantity as number
  }
  set quantity(value: number) {
    this._setAttribute('quantity', value)
  }

  /**
   * Price at time of adding to cart (in smallest currency unit)
   */
  @column()
  get price(): number {
    return this._attributes.price as number
  }
  set price(value: number) {
    this._setAttribute('price', value)
  }

  @column()
  get created_at(): Date {
    return new Date(this._attributes.created_at as string | number | Date)
  }
  set created_at(value: Date | string) {
    this._setAttribute('created_at', value instanceof Date ? value.toISOString() : value)
  }

  // ─────────────────────────────────────────────────────────────
  // Relationship Data (loaded via service)
  // ─────────────────────────────────────────────────────────────

  product?: {
    id: number
    name: string
    slug: string
    image_url: string | null
    stock: number
  }

  /**
   * Get line total
   */
  getLineTotal(): number {
    return this.price * this.quantity
  }
}
