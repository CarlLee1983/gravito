/**
 * SearchProducts Use Case
 */

import type { Product } from '@domain/product/Product'
import type { ProductRepository } from '@infrastructure/repositories/ProductRepository'

export interface SearchProductsRequest {
  query: string
  page: number
  limit: number
}

export interface SearchProductsResponse {
  data: Product[]
  total: number
  page: number
  limit: number
}

export class SearchProductsUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(request: SearchProductsRequest): Promise<SearchProductsResponse> {
    if (!request.query || request.query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters')
    }
    if (!request.page || request.page < 1) {
      throw new Error('Page must be >= 1')
    }
    if (!request.limit || request.limit < 1 || request.limit > 100) {
      throw new Error('Limit must be between 1 and 100')
    }

    return this.productRepository.search(request.query.trim(), request.page, request.limit)
  }
}
