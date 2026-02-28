import type { Coupon } from '../Entities/Coupon'

/**
 * ICouponRepository Contract
 * 定義優惠券持久化操作介面
 */
export interface ICouponRepository {
  /**
   * 根據 ID 查找優惠券
   */
  findById(id: string): Promise<Coupon | null>

  /**
   * 根據代碼查找優惠券
   */
  findByCode(code: string): Promise<Coupon | null>

  /**
   * 列出所有活躍優惠券
   */
  listActive(limit?: number, offset?: number): Promise<Coupon[]>

  /**
   * 列出所有優惠券（包括已禁用和過期）
   */
  listAll(limit?: number, offset?: number): Promise<Coupon[]>

  /**
   * 建立新優惠券
   */
  create(coupon: Coupon): Promise<Coupon>

  /**
   * 更新優惠券
   */
  update(coupon: Coupon): Promise<Coupon>

  /**
   * 刪除優惠券
   */
  delete(id: string): Promise<void>

  /**
   * 檢查代碼是否已存在
   */
  existsByCode(code: string): Promise<boolean>

  /**
   * 統計活躍優惠券數量
   */
  countActive(): Promise<number>

  /**
   * 獲取統計資訊（用於管理端）
   */
  getStats(): Promise<{
    totalCount: number
    activeCount: number
    expiredCount: number
    disabledCount: number
  }>
}
