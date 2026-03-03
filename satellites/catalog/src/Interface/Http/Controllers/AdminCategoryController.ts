import type { GravitoContext, PlanetCore } from '@gravito/core'
import { CategoryMapper } from '../../../Application/DTOs/CategoryDTO'
import { CatalogError } from '../../../Application/Errors/CatalogError'
import type { CreateCategory } from '../../../Application/UseCases/CreateCategory'
import type { DeleteCategory } from '../../../Application/UseCases/DeleteCategory'
import type { UpdateCategory } from '../../../Application/UseCases/UpdateCategory'

export class AdminCategoryController {
  constructor(private core: PlanetCore) {}

  /**
   * GET /api/admin/v1/catalog/categories
   * 取得所有分類（樹狀結構）
   */
  async index(ctx: GravitoContext) {
    try {
      const repository = this.core.container.make<any>('catalog.repository.category')
      const categories = await repository.findAll()
      const dtos = categories.map((cat: any) => CategoryMapper.toDTO(cat))
      const tree = CategoryMapper.buildTree(dtos)
      return ctx.json({ success: true, data: tree } as any)
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        return ctx.json({ success: false, message: error.message }, error.statusCode as any)
      }
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ctx.json({ success: false, message }, 500 as any)
    }
  }

  /**
   * POST /api/admin/v1/catalog/categories
   * 建立分類
   */
  async store(ctx: GravitoContext) {
    try {
      const body = (await ctx.req.json()) as Record<string, unknown>
      const useCase = this.core.container.make<CreateCategory>('catalog.usecase.createCategory')
      const category = await useCase.execute({
        name: body.name as Record<string, string>,
        slug: body.slug as string,
        parentId: body.parentId as string | null | undefined,
        description: body.description as string | undefined,
        sortOrder: body.sortOrder as number | undefined,
      })
      return ctx.json(
        { success: true, data: CategoryMapper.toDTO(category as any) } as any,
        201 as any
      )
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        return ctx.json({ success: false, message: error.message }, error.statusCode as any)
      }
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ctx.json({ success: false, message }, 500 as any)
    }
  }

  /**
   * PATCH /api/admin/v1/catalog/categories/:id
   * 更新分類資訊
   */
  async update(ctx: GravitoContext) {
    try {
      const id = ctx.req.param('id')
      if (!id) {
        return ctx.json({ success: false, message: 'Category ID is required' }, 400 as any)
      }
      const body = (await ctx.req.json()) as Record<string, unknown>
      const useCase = this.core.container.make<UpdateCategory>('catalog.usecase.updateCategory')
      const category = await useCase.execute({
        id,
        name: body.name as Record<string, string> | undefined,
        parentId: body.parentId as string | null | undefined,
        description: body.description as string | undefined,
        sortOrder: body.sortOrder as number | undefined,
      })
      return ctx.json({ success: true, data: CategoryMapper.toDTO(category as any) } as any)
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        return ctx.json({ success: false, message: error.message }, error.statusCode as any)
      }
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ctx.json({ success: false, message }, 500 as any)
    }
  }

  /**
   * DELETE /api/admin/v1/catalog/categories/:id
   * 刪除分類
   */
  async destroy(ctx: GravitoContext) {
    try {
      const id = ctx.req.param('id')
      if (!id) {
        return ctx.json({ success: false, message: 'Category ID is required' }, 400 as any)
      }
      const useCase = this.core.container.make<DeleteCategory>('catalog.usecase.deleteCategory')
      await useCase.execute({ id })
      return ctx.json({ success: true, message: 'Category deleted successfully' })
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        return ctx.json({ success: false, message: error.message }, error.statusCode as any)
      }
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ctx.json({ success: false, message }, 500 as any)
    }
  }
}
