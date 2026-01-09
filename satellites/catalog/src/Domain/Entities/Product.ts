import { Entity } from '@gravito/enterprise'

export interface VariantProps {
  productId: string
  sku: string
  name: string | null
  price: number
  compareAtPrice: number | null
  stock: number
  options: Record<string, string> // e.g., {"color": "Red"}
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any>
}

export class Variant extends Entity<string> {
  constructor(
    id: string,
    private props: VariantProps
  ) {
    super(id)
  }

  // Getters
  get sku() {
    return this.props.sku
  }
  get price() {
    return this.props.price
  }
  get stock() {
    return this.props.stock
  }
  get options() {
    return this.props.options
  }
  get metadata() {
    return this.props.metadata || {}
  }

  public reduceStock(quantity: number): void {
    if (this.props.stock < quantity) {
      throw new Error('Insufficient stock')
    }
    this.props.stock -= quantity
    this.props.updatedAt = new Date()
  }
}

export interface ProductProps {
  name: Record<string, string> // i18n
  slug: string
  description?: string
  brand?: string
  status: 'active' | 'draft' | 'archived'
  thumbnail?: string // Storage key
  variants: Variant[]
  categoryIds: string[]
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any>
}

export class Product extends Entity<string> {
  private constructor(
    id: string,
    private props: ProductProps
  ) {
    super(id)
  }

  static create(id: string, name: Record<string, string>, slug: string): Product {
    return new Product(id, {
      name,
      slug,
      status: 'active',
      variants: [],
      categoryIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(id: string, props: ProductProps): Product {
    return new Product(id, props)
  }

  // Getters
  get name() {
    return this.props.name
  }
  get slug() {
    return this.props.slug
  }
  get thumbnail() {
    return this.props.thumbnail
  }
  get variants() {
    return this.props.variants
  }
  get categoryIds() {
    return this.props.categoryIds
  }
  get metadata() {
    return this.props.metadata || {}
  }

  public setThumbnail(key: string): void {
    this.props.thumbnail = key
    this.props.updatedAt = new Date()
  }

  public addVariant(variant: Variant): void {
    this.props.variants.push(variant)
    this.props.updatedAt = new Date()
  }

  public assignToCategory(categoryId: string): void {
    if (!this.props.categoryIds.includes(categoryId)) {
      this.props.categoryIds.push(categoryId)
      this.props.updatedAt = new Date()
    }
  }
}
