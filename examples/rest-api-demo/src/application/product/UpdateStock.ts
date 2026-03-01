/**
 * UpdateStock Use Case
 *
 * 處理商品庫存更新
 */

import type { ProductRepository } from '@infrastructure/repositories/ProductRepository'

export interface UpdateStockRequest {
  productId: string
  quantity: number // 負數表示減少，正數表示增加
}

export interface UpdateStockResponse {
  productId: string
  newStock: number
}

export class UpdateStockUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(request: UpdateStockRequest): Promise<UpdateStockResponse> {
    // =====================================================================
    // 1. 驗證輸入
    // =====================================================================
    if (!request.productId) {
      throw new Error('Product ID is required')
    }
    if (!Number.isInteger(request.quantity)) {
      throw new Error('Quantity must be an integer')
    }

    // =====================================================================
    // 2. 獲取當前庫存
    // =====================================================================
    const currentStock = await this.productRepository.getStock(request.productId)
    if (currentStock === null) {
      throw new Error('Product not found')
    }

    // =====================================================================
    // 3. 驗證庫存更新是否合法
    // =====================================================================
    const newStock = currentStock + request.quantity
    if (newStock < 0) {
      throw new Error('Insufficient stock')
    }

    // =====================================================================
    // 4. 更新庫存
    // =====================================================================
    if (request.quantity > 0) {
      await this.productRepository.increaseStock(request.productId, request.quantity)
    } else if (request.quantity < 0) {
      await this.productRepository.decreaseStock(request.productId, Math.abs(request.quantity))
    }

    // =====================================================================
    // 5. 返回結果
    // =====================================================================
    return {
      productId: request.productId,
      newStock,
    }
  }
}

// Export alias for compatibility
export { UpdateStockUseCase as UpdateStock }
