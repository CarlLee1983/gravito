/**
 * GetProduct Use Case
 */

import type { Product } from '@domain/product/Product'
import type { ProductRepository } from '@infrastructure/repositories/ProductRepository'

export interface GetProductRequest {
  productId: string
}

export class GetProductUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(request: GetProductRequest): Promise<Product> {
    if (!request.productId) {
      throw new Error('Product ID is required')
    }

    const product = await this.productRepository.findById(request.productId)
    if (!product) {
      throw new Error('Product not found')
    }

    return product
  }
}
