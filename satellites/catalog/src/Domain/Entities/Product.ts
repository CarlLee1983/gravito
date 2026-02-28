import type { DomainEvent } from '@gravito/enterprise'
import { AggregateRoot } from '@gravito/enterprise'
import type { I18nText } from '../ValueObjects/I18nText'
import type { Slug } from '../ValueObjects/Slug'
import type { Variant } from './Variant'

export enum ProductStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

export interface ProductProps {
  name: I18nText
  slug: Slug
  description?: string
  brand?: string
  status: ProductStatus
  thumbnail?: string // Storage key
  variants: Variant[]
  categoryIds: string[]
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, unknown>
}

export class Product extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: ProductProps
  ) {
    super(id)
  }

  static create(id: string, name: I18nText, slug: Slug): Product {
    return new Product(id, {
      name,
      slug,
      status: ProductStatus.ACTIVE,
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
  get name(): I18nText {
    return this.props.name
  }

  get slug(): Slug {
    return this.props.slug
  }

  get thumbnail(): string | undefined {
    return this.props.thumbnail
  }

  get variants(): Variant[] {
    return this.props.variants
  }

  get categoryIds(): string[] {
    return this.props.categoryIds
  }

  get metadata(): Record<string, unknown> {
    return this.props.metadata || {}
  }

  get brand(): string | undefined {
    return this.props.brand
  }

  get status(): ProductStatus {
    return this.props.status
  }

  get description(): string | undefined {
    return this.props.description
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  /**
   * 更新商品名稱
   */
  public updateName(name: I18nText): void {
    this.props.name = name
    this.props.updatedAt = new Date()
  }

  /**
   * 更新商品 slug
   */
  public updateSlug(slug: Slug): void {
    this.props.slug = slug
    this.props.updatedAt = new Date()
  }

  /**
   * 更新商品描述
   */
  public updateDescription(description: string | undefined): void {
    this.props.description = description
    this.props.updatedAt = new Date()
  }

  /**
   * 設定縮圖
   */
  public setThumbnail(key: string): void {
    this.props.thumbnail = key
    this.props.updatedAt = new Date()
  }

  /**
   * 設定品牌
   */
  public setBrand(brand: string): void {
    this.props.brand = brand
    this.props.updatedAt = new Date()
  }

  /**
   * 上架商品
   */
  public activate(): void {
    if (this.props.status === ProductStatus.ARCHIVED) {
      throw new Error(`Cannot activate product: cannot reactivate archived product`)
    }
    this.props.status = ProductStatus.ACTIVE
    this.props.updatedAt = new Date()
  }

  /**
   * 下架商品
   */
  public archive(): void {
    if (this.props.status === ProductStatus.ARCHIVED) {
      throw new Error('Product is already archived')
    }
    this.props.status = ProductStatus.ARCHIVED
    this.props.updatedAt = new Date()
  }

  /**
   * 新增商品變體
   */
  public addVariant(variant: Variant): void {
    this.props.variants.push(variant)
    this.props.updatedAt = new Date()
    this.addDomainEvent({
      aggregateId: this.id,
      occurredAt: new Date(),
      type: 'ProductVariantAdded',
      data: { variantId: variant.id, productId: this.id },
    } as unknown as DomainEvent)
  }

  /**
   * 移除商品變體
   */
  public removeVariant(variantId: string): void {
    this.props.variants = this.props.variants.filter((v) => v.id !== variantId)
    this.props.updatedAt = new Date()
  }

  /**
   * 尋找變體
   */
  public findVariant(variantId: string): Variant | undefined {
    return this.props.variants.find((v) => v.id === variantId)
  }

  /**
   * 指派到分類
   */
  public assignToCategory(categoryId: string): void {
    if (!this.props.categoryIds.includes(categoryId)) {
      this.props.categoryIds.push(categoryId)
      this.props.updatedAt = new Date()
    }
  }

  /**
   * 從分類移除
   */
  public removeFromCategory(categoryId: string): void {
    this.props.categoryIds = this.props.categoryIds.filter((id) => id !== categoryId)
    this.props.updatedAt = new Date()
  }
}

// Re-export Variant for convenience
export { Variant, type VariantProps } from './Variant'
