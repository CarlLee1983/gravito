import type { GravitoContext } from '@gravito/core'
import { CategoryMapper } from '../../../Application/DTOs/CategoryDTO'
import type { ICategoryRepository } from '../../../Domain/Contracts/ICatalogRepository'

export class CategoryController {
  /**
   * Get the category tree
   */
  async index(c: GravitoContext) {
    const core = c.get('core' as any) as any
    const repo = core.container.make('catalog.repo.category') as ICategoryRepository

    const categories = await repo.findAll()
    const dtos = categories.map((cat) => CategoryMapper.toDTO(cat))

    return c.json({
      data: CategoryMapper.buildTree(dtos),
    })
  }
}
