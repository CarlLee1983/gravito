import { UseCase } from '@gravito/enterprise'
import type { IProductRepository } from '../../Domain/Contracts/ICatalogRepository'
import { InventoryManagementContext } from '../../Domain/DCI/Contexts/InventoryManagementContext'
import { CatalogErrorFactory } from '../Errors/CatalogError'

export interface RecoverStockInput {
  variantId: string
  quantity: number
}

/**
 * RecoverStock UseCase
 * 薄殼委派模式：所有業務邏輯在 InventoryManagementContext 中
 * 用於訂單退貨、取消或超時未支付場景
 */
export class RecoverStock extends UseCase<RecoverStockInput, void> {
  constructor(private repository: IProductRepository) {
    super()
  }

  async execute(input: RecoverStockInput): Promise<void> {
    const { variantId, quantity } = input

    // 1. 透過 variantId 找到 Product
    const product = await this.repository.findByVariantId(variantId)
    if (!product) {
      throw CatalogErrorFactory.variantNotFound(variantId)
    }

    // 2. 委派到 InventoryManagementContext 回復庫存
    const ctx = new InventoryManagementContext(this.repository)
    await ctx.recoverStock(product.id, variantId, quantity)
  }
}
