import { UseCase } from '@gravito/enterprise'
import type { IProductRepository } from '../../Domain/Contracts/ICatalogRepository'
import type { Product } from '../../Domain/Entities/Product'

export class AdminListProducts extends UseCase<void, Product[]> {
  constructor(private repository: IProductRepository) {
    super()
  }

  async execute(): Promise<Product[]> {
    return await this.repository.findAll()
  }
}
