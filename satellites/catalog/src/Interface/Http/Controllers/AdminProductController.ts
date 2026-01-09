import type { PlanetCore } from '@gravito/core'
import type { AdminListProducts } from '../../../Application/UseCases/AdminListProducts'

export class AdminProductController {
  constructor(private core: PlanetCore) {}

  /**
   * GET /api/admin/v1/catalog/products
   */
  async index(ctx: any) {
    try {
      const useCase = this.core.container.make<AdminListProducts>(
        'catalog.usecase.adminListProducts'
      )
      const products = await useCase.execute()

      return ctx.json(
        products.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: (p as any).props.price,
          stock: (p as any).props.stock,
          status: (p as any).props.status || 'active',
        }))
      )
    } catch (error: any) {
      return ctx.json({ message: error.message }, 500)
    }
  }

  /**
   * PATCH /api/admin/v1/catalog/products/:id
   */
  async update(ctx: any) {
    // 實作略，預留接口
    return ctx.json({ success: true })
  }
}
