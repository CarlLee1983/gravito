import { DB } from '@gravito/atlas'
import { UseCase } from '@gravito/enterprise'

export interface RecoverStockInput {
  variantId: string
  quantity: number
}

/**
 * RecoverStock - 安全回滾庫存 (支持 OCC)
 * 用於訂單退貨、取消或超時未支付場景
 */
export class RecoverStock extends UseCase<RecoverStockInput, void> {
  async execute(input: RecoverStockInput): Promise<void> {
    const { variantId, quantity } = input

    // 使用 SQL 原子操作增加庫存，並讓 version 自增，確保 OCC 一致性
    const affected = await DB.table('product_variants')
      .where('id', variantId)
      .update({
        stock: DB.raw('stock + ?', [quantity]),
        version: DB.raw('version + 1'),
        updated_at: new Date(),
      })

    if (affected === 0) {
      throw new Error(`Variant [${variantId}] not found during stock recovery`)
    }

    console.log(`[Catalog] Stock recovered for variant ${variantId}: +${quantity}`)
  }
}
