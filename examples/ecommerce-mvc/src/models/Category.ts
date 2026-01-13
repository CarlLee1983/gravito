import { column, Model } from '@gravito/atlas'

/**
 * Category Model
 *
 * Product categories for organizing the store.
 */
export class Category extends Model {
  static table = 'categories'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
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
  get sort_order(): number {
    return (this._attributes.sort_order as number) || 0
  }
  set sort_order(value: number) {
    this._setAttribute('sort_order', value)
  }

  @column()
  get created_at(): Date {
    return new Date(this._attributes.created_at as string | number | Date)
  }
  set created_at(value: Date | string) {
    this._setAttribute('created_at', value instanceof Date ? value.toISOString() : value)
  }

  // ─────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────

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
