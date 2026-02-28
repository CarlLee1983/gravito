import { DB } from '@gravito/atlas'
import type { ICouponRepository } from '../../../Domain/Contracts/ICouponRepository'
import { Coupon } from '../../../Domain/Entities/Coupon'

/**
 * AtlasCouponRepository
 * 優惠券持久化實現
 */
export class AtlasCouponRepository implements ICouponRepository {
  async findById(id: string): Promise<Coupon | null> {
    const row = await DB.table('coupons').where('id', id).first()
    if (!row) return null
    return this.hydrate(row)
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const row = await DB.table('coupons').where('code', code).first()
    if (!row) return null
    return this.hydrate(row)
  }

  async listActive(limit?: number, offset?: number): Promise<Coupon[]> {
    const rows = await DB.table('coupons')
      .where('status', 'ACTIVE')
      .where('expires_at', '>', new Date())
      .limit(limit ?? 20)
      .offset(offset ?? 0)
      .get()
    return (rows as any[]).map((r) => this.hydrate(r))
  }

  async listAll(limit?: number, offset?: number): Promise<Coupon[]> {
    const rows = await DB.table('coupons')
      .limit(limit ?? 20)
      .offset(offset ?? 0)
      .get()
    return (rows as any[]).map((r) => this.hydrate(r))
  }

  async create(coupon: Coupon): Promise<Coupon> {
    const props = coupon.unpack()
    await DB.table('coupons').insert({
      id: coupon.id,
      code: props.code,
      name: props.name,
      type: props.type,
      value: props.value,
      min_purchase: props.minPurchase,
      starts_at: props.startsAt,
      expires_at: props.expiresAt,
      usage_limit: props.usageLimit,
      used_count: props.usedCount,
      status: props.status,
      created_at: props.createdAt,
      updated_at: props.updatedAt,
    })
    return coupon
  }

  async update(coupon: Coupon): Promise<Coupon> {
    const props = coupon.unpack()
    await DB.table('coupons').where('id', coupon.id).update({
      code: props.code,
      name: props.name,
      type: props.type,
      value: props.value,
      min_purchase: props.minPurchase,
      starts_at: props.startsAt,
      expires_at: props.expiresAt,
      usage_limit: props.usageLimit,
      used_count: props.usedCount,
      status: props.status,
      updated_at: new Date(),
    })
    return coupon
  }

  async delete(id: string): Promise<void> {
    await DB.table('coupons').where('id', id).delete()
  }

  async existsByCode(code: string): Promise<boolean> {
    const count = await DB.table('coupons').where('code', code).count()
    return count > 0
  }

  async countActive(): Promise<number> {
    const result = await DB.table('coupons')
      .where('status', 'ACTIVE')
      .where('expires_at', '>', new Date())
      .count()
    return result
  }

  async getStats(): Promise<{
    totalCount: number
    activeCount: number
    expiredCount: number
    disabledCount: number
  }> {
    const [total, active, expired, disabled] = await Promise.all([
      DB.table('coupons').count(),
      DB.table('coupons').where('status', 'ACTIVE').where('expires_at', '>', new Date()).count(),
      DB.table('coupons')
        .where('status', 'EXPIRED')
        .orWhere((q: any) => q.where('status', 'ACTIVE').where('expires_at', '<=', new Date()))
        .count(),
      DB.table('coupons').where('status', 'DISABLED').count(),
    ])

    return {
      totalCount: total,
      activeCount: active,
      expiredCount: expired,
      disabledCount: disabled,
    }
  }

  private hydrate(row: any): Coupon {
    return Coupon.hydrate(
      {
        code: row.code,
        name: row.name,
        type: row.type,
        value: row.value,
        minPurchase: row.min_purchase,
        startsAt: new Date(row.starts_at),
        expiresAt: new Date(row.expires_at),
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        status: row.status,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      row.id
    )
  }
}
