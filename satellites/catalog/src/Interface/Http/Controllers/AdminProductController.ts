import type { PlanetCore } from '@gravito/core'
import type { Context } from '@gravito/photon'
import { CatalogErrorFactory } from '../../../Application/Errors/CatalogError'
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
  async index(ctx: Context) {
    try {
      const useCase = this.core.container.make<AdminListProducts>(
        'catalog.usecase.adminListProducts'
      )
      const products = await useCase.execute()
      return ctx.json({ success: true, data: products })
    } catch (error: any) {
      return ctx.json({ success: false, message: error.message }, 500)
    }
  }

  /**
   * GET /api/admin/v1/catalog/products/:id
   * 取得單一商品
   */
  async show(ctx: Context) {
    try {
      const id = ctx.req.param('id')
      const useCase = this.core.container.make<GetProduct>('catalog.usecase.getProduct')
      const product = await useCase.execute({ id })
      return ctx.json({ success: true, data: product })
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return ctx.json({ success: false, message: error.message }, 404)
      }
      return ctx.json({ success: false, message: error.message }, 500)
    }
  }

  /**
   * POST /api/admin/v1/catalog/products
   * 建立商品
   */
  async store(ctx: Context) {
    try {
      const body = await ctx.req.json()
      const useCase = this.core.container.make<CreateProduct>('catalog.usecase.createProduct')
      const product = await useCase.execute(body)
      return ctx.json({ success: true, data: product }, 201)
    } catch (error: any) {
      return ctx.json({ success: false, message: error.message }, 500)
    }
  }

  /**
   * PATCH /api/admin/v1/catalog/products/:id
   * 更新商品
   */
  async update(ctx: Context) {
    try {
      const id = ctx.req.param('id')
      const body = await ctx.req.json()
      const useCase = this.core.container.make<UpdateProduct>('catalog.usecase.updateProduct')
      const product = await useCase.execute({ id, ...body })
      return ctx.json({ success: true, data: product })
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return ctx.json({ success: false, message: error.message }, 404)
      }
      return ctx.json({ success: false, message: error.message }, 500)
    }
  }

  /**
   * DELETE /api/admin/v1/catalog/products/:id
   * 刪除商品
   */
  async destroy(ctx: Context) {
    try {
      const id = ctx.req.param('id')
      const useCase = this.core.container.make<DeleteProduct>('catalog.usecase.deleteProduct')
      await useCase.execute({ id })
      return ctx.json({ success: true, message: 'Product deleted successfully' })
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return ctx.json({ success: false, message: error.message }, 404)
      }
      return ctx.json({ success: false, message: error.message }, 500)
    }
  }
}
