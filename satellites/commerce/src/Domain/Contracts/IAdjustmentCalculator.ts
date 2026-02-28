import type { AdjustmentType } from '../ValueObjects/Adjustment'

/**
 * 調整項計算服務輸入
 */
export interface AdjustmentCalculatorItem {
  productId: string
  variantId: string
  sku: string
  name: string
  unitPrice: number
  quantity: number
  options?: Record<string, string>
}

/**
 * 調整項計算結果
 */
export interface AdjustmentCalculatorResult {
  type: AdjustmentType
  label: string
  amount: number
  sourceType?: string
  sourceId?: string
}

/**
 * 調整項計算器契約
 *
 * 可由外部 Satellite（如 Marketing）提供實作，
 * 用於計算折扣、運費、稅務等調整項目
 */
export interface IAdjustmentCalculator {
  /**
   * 計算訂單調整項目
   *
   * @param items - 訂單明細項目
   * @param currency - 訂單幣別
   * @returns 調整項目清單
   */
  calculate(
    items: AdjustmentCalculatorItem[],
    currency: string
  ): Promise<AdjustmentCalculatorResult[]>
}
