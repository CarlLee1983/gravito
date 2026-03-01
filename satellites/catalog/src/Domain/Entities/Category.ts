import { Entity } from '@gravito/enterprise'
import type { I18nText } from '../ValueObjects/I18nText'
import type { Slug } from '../ValueObjects/Slug'

export interface CategoryProps {
  parentId: string | null
  path: string | null
  name: I18nText
  slug: Slug
  description?: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, unknown>
}

export class Category extends Entity<string> {
  private constructor(
    id: string,
    private props: CategoryProps
  ) {
    super(id)
  }

  static create(id: string, name: I18nText, slug: Slug, parentId: string | null = null): Category {
    return new Category(id, {
      parentId,
      path: null,
      name,
      slug,
      description: undefined,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(id: string, props: CategoryProps): Category {
    return new Category(id, props)
  }

  // Getters
  get parentId(): string | null {
    return this.props.parentId
  }

  get path(): string | null {
    return this.props.path
  }

  get name(): I18nText {
    return this.props.name
  }

  get slug(): Slug {
    return this.props.slug
  }

  get description(): string | undefined {
    return this.props.description
  }

  get sortOrder(): number {
    return this.props.sortOrder
  }

  get metadata(): Record<string, unknown> {
    return this.props.metadata || {}
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  /**
   * 設置分類名稱
   * DCI 模式：Role 層負責驗證和業務規則
   */
  public setName(name: I18nText): void {
    this.props.name = name
    this.props.updatedAt = new Date()
  }

  /**
   * 設置分類描述
   */
  public setDescription(description: string | undefined): void {
    this.props.description = description
    this.props.updatedAt = new Date()
  }

  /**
   * 設置排序順序
   */
  public setSortOrder(sortOrder: number): void {
    this.props.sortOrder = sortOrder
    this.props.updatedAt = new Date()
  }

  /**
   * 設置分類路徑
   * 路徑計算邏輯應在 Role 層進行
   */
  public setPath(path: string | null): void {
    this.props.path = path
    this.props.updatedAt = new Date()
  }

  /**
   * 設置父分類 ID
   * 路徑更新邏輯應在 Role 層進行
   */
  public setParentId(parentId: string | null): void {
    this.props.parentId = parentId
    this.props.updatedAt = new Date()
  }

  /**
   * 取得完整的 props 物件（用於 Repository）
   */
  get propsObject(): CategoryProps {
    return { ...this.props }
  }
}
