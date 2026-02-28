import type { AdStatus, Advertisement } from '../Entities/Advertisement'

/**
 * 廣告 Repository 介面
 *
 * 定義 Domain 層的資料存取契約，由 Infrastructure 層實現。
 */
export interface IAdRepository {
  /** 保存（新增或更新）廣告 */
  save(ad: Advertisement): Promise<void>

  /** 依 ID 查詢廣告 */
  findById(id: string): Promise<Advertisement | null>

  /** 依版位查詢所有廣告 */
  findBySlot(slotSlug: string): Promise<Advertisement[]>

  /** 依版位查詢活躍中的廣告 */
  findActiveBySlot(slotSlug: string, now?: Date): Promise<Advertisement[]>

  /** 查詢廣告列表（支援篩選與分頁） */
  findAll(filters?: {
    status?: AdStatus
    slotSlug?: string
    limit?: number
    offset?: number
  }): Promise<{ items: Advertisement[]; total: number }>

  /** 刪除廣告 */
  delete(id: string): Promise<void>

  /** 確認廣告是否存在 */
  exists(id: string): Promise<boolean>
}
