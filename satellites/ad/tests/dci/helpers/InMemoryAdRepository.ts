import type { IAdRepository } from '../../../src/Domain/Contracts/IAdRepository'
import type { AdStatus, Advertisement } from '../../../src/Domain/Entities/Advertisement'

/**
 * 記憶體內 Ad Repository（測試用）
 *
 * 實作 IAdRepository 介面，將資料儲存在 Map 中。
 */
export class InMemoryAdRepository implements IAdRepository {
  private ads: Map<string, Advertisement> = new Map()

  async save(ad: Advertisement): Promise<void> {
    this.ads.set(ad.id, ad)
  }

  async findById(id: string): Promise<Advertisement | null> {
    return this.ads.get(id) ?? null
  }

  async findBySlot(slotSlug: string): Promise<Advertisement[]> {
    return Array.from(this.ads.values()).filter((ad) => ad.slotSlug.value === slotSlug)
  }

  async findActiveBySlot(slotSlug: string, now?: Date): Promise<Advertisement[]> {
    return Array.from(this.ads.values()).filter(
      (ad) => ad.slotSlug.value === slotSlug && ad.isDeliverable(now)
    )
  }

  async findAll(filters?: {
    status?: AdStatus
    slotSlug?: string
    limit?: number
    offset?: number
  }): Promise<{ items: Advertisement[]; total: number }> {
    let items = Array.from(this.ads.values())

    if (filters?.status) {
      items = items.filter((ad) => ad.status === filters.status)
    }
    if (filters?.slotSlug) {
      items = items.filter((ad) => ad.slotSlug.value === filters.slotSlug)
    }

    const total = items.length
    const offset = filters?.offset ?? 0
    const limit = filters?.limit ?? items.length
    items = items.slice(offset, offset + limit)

    return { items, total }
  }

  async delete(id: string): Promise<void> {
    this.ads.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    return this.ads.has(id)
  }

  /** 測試輔助：取得目前儲存的廣告數量 */
  get size(): number {
    return this.ads.size
  }

  /** 測試輔助：清空所有資料 */
  clear(): void {
    this.ads.clear()
  }
}
