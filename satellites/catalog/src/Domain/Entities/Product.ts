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
   * 設置商品名稱
   * DCI 模式：Role 層負責驗證和業務規則
   */
  public setName(name: I18nText): void {
    this.props.name = name
    this.props.updatedAt = new Date()
  }

  /**
   * 設置商品 slug
   */
  public setSlug(slug: Slug): void {
    this.props.slug = slug
    this.props.updatedAt = new Date()
  }

  /**
   * 設置商品描述
   */
  public setDescription(description: string | undefined): void {
    this.props.description = description
    this.props.updatedAt = new Date()
  }

  /**
   * 設置縮圖
   */
  public setThumbnail(key: string | undefined): void {
    this.props.thumbnail = key
    this.props.updatedAt = new Date()
  }

  /**
   * 設置品牌
   */
  public setBrand(brand: string | undefined): void {
    this.props.brand = brand
    this.props.updatedAt = new Date()
  }

  /**
   * 設置商品狀態
   * 狀態機邏輯應在 Role 層進行
   */
  public setStatus(status: ProductStatus): void {
    this.props.status = status
    this.props.updatedAt = new Date()
  }

  /**
   * 設置商品變體列表
   * 變體管理邏輯應在 Role 層進行
   */
  public setVariants(variants: Variant[]): void {
    this.props.variants = variants
    this.props.updatedAt = new Date()
  }

  /**
   * 設置分類 ID 列表
   * 分類邏輯應在 Role 層進行
   */
  public setCategoryIds(categoryIds: string[]): void {
    this.props.categoryIds = categoryIds
    this.props.updatedAt = new Date()
  }

  /**
   * 取得完整的 props 物件（用於 Repository）
   */
  get propsObject(): ProductProps {
    return { ...this.props }
  }
}

// Re-export Variant for convenience
export { Variant, type VariantProps } from './Variant'
