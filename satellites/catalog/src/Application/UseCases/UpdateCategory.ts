import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { ICategoryRepository } from '../../Domain/Contracts/ICatalogRepository'
import { type CategoryDTO, CategoryMapper } from '../DTOs/CategoryDTO'

export interface UpdateCategoryInput {
  id: string
  name?: Record<string, string>
  parentId?: string | null
}

export class UpdateCategory extends UseCase<UpdateCategoryInput, CategoryDTO> {
  constructor(
    private repository: ICategoryRepository,
    private core: PlanetCore
  ) {
    super()
  }

  async execute(input: UpdateCategoryInput): Promise<CategoryDTO> {
    const category = await this.repository.findById(input.id)
    if (!category) {
      throw new Error('Category not found')
    }

    const oldPath = category.path
    const isMoving = input.parentId !== undefined && input.parentId !== category.parentId

    // 1. 更新基本屬性
    if (input.name) {
      // @ts-expect-error
      category.props.name = input.name
    }

    // 2. 處理移動邏輯 (關鍵！)
    if (isMoving) {
      category.moveTo(input.parentId!)

      // 獲取新父節點的路徑
      const newParent = input.parentId ? await this.repository.findById(input.parentId) : null
      const newPath = newParent ? `${newParent.path}/${category.slug}` : category.slug

      // 3. 同步更新所有子孫路徑 (必須在更新自己之前，使用舊路徑查找)
      if (oldPath) {
        const descendants = await this.repository.findByPathPrefix(oldPath)
        console.log(`[Debug] 找到子孫數量: ${descendants.length} (使用前綴: ${oldPath})`)
        for (const desc of descendants) {
          if (desc.id === category.id) {
            continue
          }

          // 確保只替換開頭的路徑部分
          const subPath = desc.path?.substring(oldPath.length)
          // @ts-expect-error
          desc.props.path = newPath + subPath
          await this.repository.save(desc)
        }
      }

      // 更新自己
      // @ts-expect-error
      category.props.path = newPath
    }

    await this.repository.save(category)

    await this.core.hooks.doAction('catalog:category-updated', {
      categoryId: category.id,
      moved: isMoving,
    })

    return CategoryMapper.toDTO(category)
  }
}
