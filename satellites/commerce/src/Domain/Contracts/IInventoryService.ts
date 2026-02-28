/**
 * 庫存服務契約
 *
 * 透過此契約與外部 Satellite（如 Catalog）通訊
 * 實現透過事件而非直接依賴的方式協調庫存
 */
export interface IInventoryService {
  /**
   * 檢查庫存是否充足
   */
  hasStock(variantId: string, quantity: number): Promise<boolean>

  /**
   * 獲取庫存數量
   */
  getStock(variantId: string): Promise<number>

  /**
   * 扣減庫存（由 Commerce Satellite 在支付成功時呼叫）
   */
  deductStock(variantId: string, quantity: number): Promise<boolean>

  /**
   * 恢復庫存（由 Commerce Satellite 在退款時呼叫）
   */
  replenishStock(variantId: string, quantity: number): Promise<boolean>
}
