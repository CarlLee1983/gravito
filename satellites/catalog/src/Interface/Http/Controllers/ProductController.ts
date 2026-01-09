import type { GravitoContext } from '@gravito/core'
import { ProductMapper } from '../../../Application/DTOs/ProductDTO'
import type { CreateProduct } from '../../../Application/UseCases/CreateProduct'
import type { IProductRepository } from '../../../Domain/Contracts/ICatalogRepository'

export class ProductController {
  /**
   * List all products
   */
  async index(c: GravitoContext) {
    const core = c.get('core' as any) as any
    const repo = core.container.make('catalog.repo.product') as IProductRepository

    const products = await repo.findAll()
    return c.json({
      data: products.map((p) => ProductMapper.toDTO(p)),
    })
  }

  /**
   * Get a single product details
   */
  async show(c: GravitoContext) {
    const id = c.req.param('id') as string
    const core = c.get('core' as any) as any
    const repo = core.container.make('catalog.repo.product') as IProductRepository

    const product = await repo.findById(id)
    if (!product) {
      return c.json({ error: 'Product not found' }, 404)
    }

    return c.json({
      data: ProductMapper.toDTO(product),
    })
  }

  /**
   * Create a new product (Admin Only)
   */
  async store(c: GravitoContext) {
    const core = c.get('core' as any) as any
    const useCase = core.container.make('catalog.create-product') as CreateProduct

    const body = (await c.req.json()) as any
    const productDTO = await useCase.execute(body)

    return c.json(
      {
        message: 'Product created successfully',
        data: productDTO,
      },
      201
    )
  }
}
