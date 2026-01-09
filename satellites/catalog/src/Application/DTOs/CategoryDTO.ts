import type { Category } from '../../Domain/Entities/Category'

export interface CategoryDTO {
  id: string
  parentId: string | null
  path: string | null
  name: Record<string, string>
  slug: string
  sortOrder: number
  children?: CategoryDTO[] // For tree view
}

export class CategoryMapper {
  static toDTO(category: Category): CategoryDTO {
    return {
      id: category.id,
      parentId: category.parentId,
      path: category.path,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
    }
  }

  /**
   * Helper to build a tree structure from a flat array of DTOs
   */
  static buildTree(dtos: CategoryDTO[]): CategoryDTO[] {
    const map = new Map<string, CategoryDTO & { children: CategoryDTO[] }>()
    const roots: CategoryDTO[] = []

    // Initialize map
    for (const dto of dtos) {
      map.set(dto.id, { ...dto, children: [] })
    }

    // Link children to parents
    for (const dto of dtos) {
      const node = map.get(dto.id)!
      if (dto.parentId && map.has(dto.parentId)) {
        map.get(dto.parentId)?.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots.sort((a, b) => a.sortOrder - b.sortOrder)
  }
}
