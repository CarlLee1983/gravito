import { Entity } from '@gravito/enterprise'

export interface CategoryProps {
  parentId: string | null
  path: string | null
  name: Record<string, string> // i18n
  slug: string
  description?: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any>
}

export class Category extends Entity<string> {
  private constructor(
    id: string,
    private props: CategoryProps
  ) {
    super(id)
  }

  static create(
    id: string,
    name: Record<string, string>,
    slug: string,
    parentId: string | null = null
  ): Category {
    return new Category(id, {
      parentId,
      path: null, // Will be computed by repository/service
      name,
      slug,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(id: string, props: CategoryProps): Category {
    return new Category(id, props)
  }

  // Getters
  get parentId() {
    return this.props.parentId
  }
  get path() {
    return this.props.path
  }
  get name() {
    return this.props.name
  }
  get slug() {
    return this.props.slug
  }
  get sortOrder() {
    return this.props.sortOrder
  }
  get metadata() {
    return this.props.metadata || {}
  }

  /**
   * Update the path based on parent's path
   */
  public updatePath(parentPath: string | null): void {
    if (parentPath) {
      this.props.path = `${parentPath}/${this.props.slug}`
    } else {
      this.props.path = this.props.slug
    }
    this.props.updatedAt = new Date()
  }

  /**
   * Change the parent category
   */
  public moveTo(newParentId: string | null): void {
    this.props.parentId = newParentId
    this.props.updatedAt = new Date()
  }
}
