import { column, Model } from '@gravito/atlas'

/**
 * Product Model
 *
 * Represents a product in the e-commerce store.
 */
export class Product extends Model {
  static table = 'products'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get category_id(): number | null {
    return (this._attributes.category_id as number) || null
  }
  set category_id(value: number | null) {
    this._setAttribute('category_id', value)
  }

  @column()
  get name(): string {
    return this._attributes.name as string
  }
  set name(value: string) {
    this._setAttribute('name', value)
  }

  @column()
  get slug(): string {
    return this._attributes.slug as string
  }
  set slug(value: string) {
    this._setAttribute('slug', value)
  }

  @column()
  get description(): string | null {
    return (this._attributes.description as string) || null
  }
  set description(value: string | null) {
    this._setAttribute('description', value)
  }

  /**
   * Price in smallest currency unit (e.g., cents for USD, 分 for TWD)
   */
  @column()
  get price(): number {
    return this._attributes.price as number
  }
  set price(value: number) {
    this._setAttribute('price', value)
  }

  /**
   * Compare-at price (original price for showing discount)
   */
  @column()
  get compare_at_price(): number | null {
    return (this._attributes.compare_at_price as number) || null
  }
  set compare_at_price(value: number | null) {
    this._setAttribute('compare_at_price', value)
  }

  @column()
  get stock(): number {
    return (this._attributes.stock as number) || 0
  }
  set stock(value: number) {
    this._setAttribute('stock', value)
  }

  @column()
  get image_url(): string | null {
    return (this._attributes.image_url as string) || null
  }
  set image_url(value: string | null) {
    this._setAttribute('image_url', value)
  }

  @column()
  get is_active(): boolean {
    return (this._attributes.is_active as boolean) ?? true
  }
  set is_active(value: boolean) {
    this._setAttribute('is_active', value)
  }

  @column()
  get is_featured(): boolean {
    return (this._attributes.is_featured as boolean) ?? false
  }
  set is_featured(value: boolean) {
    this._setAttribute('is_featured', value)
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
  // Helper Methods
  // ─────────────────────────────────────────────────────────────

  /**
   * Get formatted price (TWD)
   */
  getFormattedPrice(): string {
    return `NT$ ${(this.price / 100).toLocaleString()}`
  }

  /**
   * Check if product is in stock
   */
  isInStock(): boolean {
    return this.stock > 0
  }

  /**
   * Check if product has discount
   */
  hasDiscount(): boolean {
    return this.compare_at_price !== null && this.compare_at_price > this.price
  }

  /**
   * Get discount percentage
   */
  getDiscountPercentage(): number {
    if (!this.hasDiscount() || !this.compare_at_price) {
      return 0
    }
    return Math.round((1 - this.price / this.compare_at_price) * 100)
  }

  /**
   * Generate slug from name
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
