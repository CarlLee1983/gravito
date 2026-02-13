/**
 * ListProducts Use Case
 */

import type { Product } from '@domain/product/Product'
import type { ProductRepository } from '@infrastructure/repositories/ProductRepository'

export interface ListProductsRequest {
  page: number
  limit: number
  categoryId?: string
}

export interface ListProductsResponse {
  data: Product[]
  total: number
  page: number
  limit: number
}

export class ListProductsUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(request: ListProductsRequest): Promise<ListProductsResponse> {
    if (!request.page || request.page < 1) {
      throw new Error('Page must be >= 1')
    }
    if (!request.limit || request.limit < 1 || request.limit > 100) {
      throw new Error('Limit must be between 1 and 100')
    }

    if (request.categoryId) {
      return this.productRepository.findByCategory(request.categoryId, request.page, request.limit)
    }

    return this.productRepository.findAll(request.page, request.limit)
  }
}
