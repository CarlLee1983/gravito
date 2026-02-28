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
   * 更新分類名稱
   */
  public updateName(name: I18nText): void {
    this.props.name = name
    this.props.updatedAt = new Date()
  }

  /**
   * 更新分類描述
   */
  public updateDescription(description: string | undefined): void {
    this.props.description = description
    this.props.updatedAt = new Date()
  }

  /**
   * 更新排序順序
   */
  public updateSortOrder(sortOrder: number): void {
    this.props.sortOrder = sortOrder
    this.props.updatedAt = new Date()
  }

  /**
   * 計算並設定路徑
   * 基於 parent 的路徑和自己的 slug
   */
  public updatePath(parentPath: string | null): void {
    const parentPathValue = parentPath ? `${parentPath}/` : ''
    this.props.path = `${parentPathValue}${this.props.slug.value}`
    this.props.updatedAt = new Date()
  }

  /**
   * 計算子分類應有的路徑前綴
   */
  public computeChildPathPrefix(): string {
    return this.props.path || ''
  }

  /**
   * 直接設定路徑（用於路徑同步，不重新計算 slug）
   * @internal
   */
  public setPathDirect(path: string | null): void {
    this.props.path = path
    this.props.updatedAt = new Date()
  }

  /**
   * 變更父分類
   */
  public moveTo(newParentId: string | null): void {
    this.props.parentId = newParentId
    this.props.updatedAt = new Date()
  }
}
