import type { IAdRepository } from '../../Domain/Contracts/IAdRepository'
import type { AdStatus, Advertisement } from '../../Domain/Entities/Advertisement'
import { type AdvertisementRow, isAdvertisementRow, reconstituteAdvertisement } from './AdDbTypes'

/** 預設每頁數量 */
const DEFAULT_LIMIT = 20

/**
 * DB Facade 介面
 *
 * 抽象化 Atlas DB 存取，方便測試注入 mock。
 */
export interface DbFacade {
  table(name: string): QueryBuilder
  transaction(fn: (db: DbFacade) => Promise<void>): Promise<void>
}

/**
 * 查詢建構器介面
 */
export interface QueryBuilder {
  where(column: string, value: unknown): QueryBuilder
  first(): Promise<unknown>
  get(): Promise<unknown[]>
  insert(data: Record<string, unknown>): Promise<unknown>
  update(data: Record<string, unknown>): Promise<unknown>
  delete(): Promise<unknown>
  exists(): Promise<boolean>
  count(): Promise<number>
  limit(value: number): QueryBuilder
  offset(value: number): QueryBuilder
  clone(): QueryBuilder
}

/**
 * Atlas ORM 廣告 Repository 實作
 *
 * 實作 IAdRepository 介面，使用 Atlas DB facade 進行資料存取。
 * 所有 Entity 重建均透過 AdDbTypes 的 reconstitute 函式完成。
 */
export class AtlasAdRepository implements IAdRepository {
  private readonly tableName = 'advertisements'

  constructor(private readonly db: DbFacade) {}

  /**
   * 保存廣告（新增或更新）
   *
   * 使用交易確保原子性。若 ID 已存在則更新，否則新增。
   */
  async save(ad: Advertisement): Promise<void> {
    await this.db.transaction(async (db) => {
      const props = ad.toProps()

      const existing = await db.table(this.tableName).where('id', ad.id).first()

      const data: Record<string, unknown> = {
        slot_slug: props.slotSlug.value,
        title: props.title,
        image_url: props.imageUrl,
        target_url: props.targetUrl,
        weight: props.weight.value,
        status: props.status,
        starts_at: props.schedule.startsAt.toISOString(),
        ends_at: props.schedule.endsAt.toISOString(),
        metadata:
          Object.keys(props.metadata ?? {}).length > 0 ? JSON.stringify(props.metadata) : null,
        updated_at: props.updatedAt.toISOString(),
      }

      if (existing) {
        await db.table(this.tableName).where('id', ad.id).update(data)
      } else {
        await db.table(this.tableName).insert({
          id: ad.id,
          ...data,
          created_at: props.createdAt.toISOString(),
        })
      }
    })
  }

  /**
   * 依 ID 查詢廣告
   */
  async findById(id: string): Promise<Advertisement | null> {
    const row = await this.db.table(this.tableName).where('id', id).first()

    if (!row || !isAdvertisementRow(row)) {
      return null
    }

    return reconstituteAdvertisement(row)
  }

  /**
   * 依版位查詢所有廣告
   */
  async findBySlot(slotSlug: string): Promise<Advertisement[]> {
    const rows = await this.db.table(this.tableName).where('slot_slug', slotSlug).get()

    return rows
      .filter((row): row is AdvertisementRow => isAdvertisementRow(row))
      .map(reconstituteAdvertisement)
  }

  /**
   * 依版位查詢活躍中的廣告
   *
   * 在 DB 層級過濾狀態為 ACTIVE 的廣告，減少記憶體消耗。
   * 排程驗證（是否在活躍期間內）仍在記憶體中進行，因為需要 AdSchedule 物件。
   */
  async findActiveBySlot(slotSlug: string, now?: Date): Promise<Advertisement[]> {
    const rows = await this.db
      .table(this.tableName)
      .where('slot_slug', slotSlug)
      .where('status', 'active')
      .get()

    const ads = rows
      .filter((row): row is AdvertisementRow => isAdvertisementRow(row))
      .map(reconstituteAdvertisement)

    return ads.filter((ad) => ad.isDeliverable(now))
  }

  /**
   * 查詢廣告列表（支援篩選與分頁）
   */
  async findAll(filters?: {
    status?: AdStatus
    slotSlug?: string
    limit?: number
    offset?: number
  }): Promise<{ items: Advertisement[]; total: number }> {
    let query = this.db.table(this.tableName)

    if (filters?.status) {
      query = query.where('status', filters.status)
    }

    if (filters?.slotSlug) {
      query = query.where('slot_slug', filters.slotSlug)
    }

    // 計算總數
    const total = await query.clone().count()

    // 分頁
    const limit = filters?.limit ?? DEFAULT_LIMIT
    const offset = filters?.offset ?? 0
    const rows = await query.limit(limit).offset(offset).get()

    const items = rows
      .filter((row): row is AdvertisementRow => isAdvertisementRow(row))
      .map(reconstituteAdvertisement)

    return { items, total }
  }

  /**
   * 刪除廣告
   */
  async delete(id: string): Promise<void> {
    await this.db.table(this.tableName).where('id', id).delete()
  }

  /**
   * 確認廣告是否存在
   */
  async exists(id: string): Promise<boolean> {
    return this.db.table(this.tableName).where('id', id).exists()
  }
}
