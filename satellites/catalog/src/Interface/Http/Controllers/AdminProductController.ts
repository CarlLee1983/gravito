import type { GravitoContext, PlanetCore } from '@gravito/core'
import { CatalogError } from '../../../Application/Errors/CatalogError'
import type { AdminListProducts } from '../../../Application/UseCases/AdminListProducts'
import type { CreateProduct } from '../../../Application/UseCases/CreateProduct'
import type { DeleteProduct } from '../../../Application/UseCases/DeleteProduct'
import type { GetProduct } from '../../../Application/UseCases/GetProduct'
import type { UpdateProduct } from '../../../Application/UseCases/UpdateProduct'

export class AdminProductController {
  constructor(private core: PlanetCore) {}

  /**
   * GET /api/admin/v1/catalog/products
   * 取得所有商品列表
   */
  async index(ctx: GravitoContext) {
    try {
      const useCase = this.core.container.make<AdminListProducts>(
        'catalog.usecase.adminListProducts'
      )
      const products = await useCase.execute()
      return ctx.json({ success: true, data: products })
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        return ctx.json({ success: false, message: error.message }, error.statusCode as any)
      }
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ctx.json({ success: false, message }, 500 as any)
    }
  }

  /**
   * GET /api/admin/v1/catalog/products/:id
   * 取得單一商品
   */
  async show(ctx: GravitoContext) {
    try {
      const id = ctx.req.param('id')
      if (!id) {
        return ctx.json({ success: false, message: 'Product ID is required' }, 400 as any)
      }
      const useCase = this.core.container.make<GetProduct>('catalog.usecase.getProduct')
      const product = await useCase.execute({ id })
      return ctx.json({ success: true, data: product })
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        return ctx.json({ success: false, message: error.message }, error.statusCode as any)
      }
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ctx.json({ success: false, message }, 500 as any)
    }
  }

  /**
   * POST /api/admin/v1/catalog/products
   * 建立商品
   */
  async store(ctx: GravitoContext) {
    try {
      const body = (await ctx.req.json()) as Record<string, unknown>
      const useCase = this.core.container.make<CreateProduct>('catalog.usecase.createProduct')
      const product = await useCase.execute({
        name: body.name as Record<string, string>,
        slug: body.slug as string,
        brand: body.brand as string | undefined,
        description: body.description as string | undefined,
        categoryIds: body.categoryIds as string[] | undefined,
        variants: body.variants as Array<{
          sku: string
          name?: string
          price: number
          compareAtPrice?: number
          stock: number
          options: Record<string, string>
        }>,
      })
      return ctx.json({ success: true, data: product }, 201)
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        return ctx.json({ success: false, message: error.message }, error.statusCode as any)
      }
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ctx.json({ success: false, message }, 500 as any)
    }
  }

  /**
   * PATCH /api/admin/v1/catalog/products/:id
   * 更新商品
   */
  async update(ctx: GravitoContext) {
    try {
      const id = ctx.req.param('id')
      if (!id) {
        return ctx.json({ success: false, message: 'Product ID is required' }, 400 as any)
      }
      const body = (await ctx.req.json()) as Record<string, unknown>
      const useCase = this.core.container.make<UpdateProduct>('catalog.usecase.updateProduct')
      const product = await useCase.execute({
        id,
        name: body.name as Record<string, string> | undefined,
        slug: body.slug as string | undefined,
        description: body.description as string | undefined,
        brand: body.brand as string | undefined,
        categoryIds: body.categoryIds as string[] | undefined,
      })
      return ctx.json({ success: true, data: product })
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        return ctx.json({ success: false, message: error.message }, error.statusCode as any)
      }
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ctx.json({ success: false, message }, 500 as any)
    }
  }

  /**
   * DELETE /api/admin/v1/catalog/products/:id
   * 刪除商品
   */
  async destroy(ctx: GravitoContext) {
    try {
      const id = ctx.req.param('id')
      if (!id) {
        return ctx.json({ success: false, message: 'Product ID is required' }, 400 as any)
      }
      const useCase = this.core.container.make<DeleteProduct>('catalog.usecase.deleteProduct')
      await useCase.execute({ id })
      return ctx.json({ success: true, message: 'Product deleted successfully' })
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        return ctx.json({ success: false, message: error.message }, error.statusCode as any)
      }
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ctx.json({ success: false, message }, 500 as any)
    }
  }
}
