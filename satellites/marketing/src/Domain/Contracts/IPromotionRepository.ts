import type { Promotion } from '../Entities/Promotion'

/**
 * IPromotionRepository Contract
 * 定義促銷活動持久化操作介面
 */
export interface IPromotionRepository {
  /**
   * 根據 ID 查找促銷活動
   */
  findById(id: string): Promise<Promotion | null>

  /**
   * 列出所有活躍的促銷活動（未過期且已啟用）
   * 按優先級降序排列
   */
  listActive(limit?: number, offset?: number): Promise<Promotion[]>

  /**
   * 列出所有促銷活動（包括已過期和已禁用）
   */
  listAll(limit?: number, offset?: number): Promise<Promotion[]>

  /**
   * 按指定時間查找活躍的促銷活動
   */
  findActiveAt(date: Date, limit?: number, offset?: number): Promise<Promotion[]>

  /**
   * 建立新促銷活動
   */
  create(promotion: Promotion): Promise<Promotion>

  /**
   * 更新促銷活動
   */
  update(promotion: Promotion): Promise<Promotion>

  /**
   * 刪除促銷活動
   */
  delete(id: string): Promise<void>

  /**
   * 統計活躍促銷活動數量
   */
  countActive(): Promise<number>

  /**
   * 獲取統計資訊（用於管理端）
   */
  getStats(): Promise<{
    totalCount: number
    activeCount: number
    expiredCount: number
    inactiveCount: number
  }>
}
