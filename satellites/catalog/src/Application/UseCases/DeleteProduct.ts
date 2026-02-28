import { UseCase } from '@gravito/enterprise'
import type { IProductRepository } from '../../Domain/Contracts/ICatalogRepository'
import { CatalogErrorFactory } from '../Errors/CatalogError'

export interface DeleteProductInput {
  id: string
}

/**
 * DeleteProduct UseCase
 * 薄殼委派模式：驗證商品存在後直接委派給 Repository
 */
export class DeleteProduct extends UseCase<DeleteProductInput, void> {
  constructor(private repository: IProductRepository) {
    super()
  }

  async execute(input: DeleteProductInput): Promise<void> {
    const product = await this.repository.findById(input.id)
    if (!product) {
      throw CatalogErrorFactory.productNotFound(input.id)
    }
    await this.repository.delete(input.id)
  }
}
