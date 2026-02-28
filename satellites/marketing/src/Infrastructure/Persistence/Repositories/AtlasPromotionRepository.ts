import { DB } from '@gravito/atlas'
import type { IPromotionRepository } from '../../../Domain/Contracts/IPromotionRepository'
import { Promotion } from '../../../Domain/Entities/Promotion'

/**
 * AtlasPromotionRepository
 * 促銷活動持久化實現
 */
export class AtlasPromotionRepository implements IPromotionRepository {
  async findById(id: string): Promise<Promotion | null> {
    const row = await DB.table('promotions').where('id', id).first()
    if (!row) return null
    return this.hydrate(row)
  }

  async listActive(limit?: number, offset?: number): Promise<Promotion[]> {
    const now = new Date()
    const rows = await DB.table('promotions')
      .where('status', 'ACTIVE')
      .where('starts_at', '<=', now)
      .where('expires_at', '>', now)
      .orderBy('priority', 'desc')
      .limit(limit ?? 20)
      .offset(offset ?? 0)
      .get()
    return (rows as any[]).map((r) => this.hydrate(r))
  }

  async listAll(limit?: number, offset?: number): Promise<Promotion[]> {
    const rows = await DB.table('promotions')
      .orderBy('priority', 'desc')
      .limit(limit ?? 20)
      .offset(offset ?? 0)
      .get()
    return (rows as any[]).map((r) => this.hydrate(r))
  }

  async findActiveAt(date: Date, limit?: number, offset?: number): Promise<Promotion[]> {
    const rows = await DB.table('promotions')
      .where('status', 'ACTIVE')
      .where('starts_at', '<=', date)
      .where('expires_at', '>', date)
      .orderBy('priority', 'desc')
      .limit(limit ?? 20)
      .offset(offset ?? 0)
      .get()
    return (rows as any[]).map((r) => this.hydrate(r))
  }

  async create(promotion: Promotion): Promise<Promotion> {
    const props = promotion.unpack()
    await DB.table('promotions').insert({
      id: promotion.id,
      name: props.name,
      type: props.type,
      description: props.description,
      configuration: JSON.stringify(props.configuration),
      priority: props.priority,
      starts_at: props.startsAt,
      expires_at: props.expiresAt,
      status: props.status,
      created_at: props.createdAt,
      updated_at: props.updatedAt,
    })
    return promotion
  }

  async update(promotion: Promotion): Promise<Promotion> {
    const props = promotion.unpack()
    await DB.table('promotions')
      .where('id', promotion.id)
      .update({
        name: props.name,
        type: props.type,
        description: props.description,
        configuration: JSON.stringify(props.configuration),
        priority: props.priority,
        starts_at: props.startsAt,
        expires_at: props.expiresAt,
        status: props.status,
        updated_at: new Date(),
      })
    return promotion
  }

  async delete(id: string): Promise<void> {
    await DB.table('promotions').where('id', id).delete()
  }

  async countActive(): Promise<number> {
    const now = new Date()
    const result = await DB.table('promotions')
      .where('status', 'ACTIVE')
      .where('starts_at', '<=', now)
      .where('expires_at', '>', now)
      .count()
    return result
  }

  async getStats(): Promise<{
    totalCount: number
    activeCount: number
    expiredCount: number
    inactiveCount: number
  }> {
    const now = new Date()
    const [total, active, expired, inactive] = await Promise.all([
      DB.table('promotions').count(),
      DB.table('promotions')
        .where('status', 'ACTIVE')
        .where('starts_at', '<=', now)
        .where('expires_at', '>', now)
        .count(),
      DB.table('promotions').where('status', 'ACTIVE').where('expires_at', '<=', now).count(),
      DB.table('promotions').where('status', 'INACTIVE').count(),
    ])

    return {
      totalCount: total,
      activeCount: active,
      expiredCount: expired,
      inactiveCount: inactive,
    }
  }

  private hydrate(row: any): Promotion {
    return Promotion.hydrate(
      {
        name: row.name,
        type: row.type,
        description: row.description,
        configuration:
          typeof row.configuration === 'string' ? JSON.parse(row.configuration) : row.configuration,
        priority: row.priority,
        startsAt: new Date(row.starts_at),
        expiresAt: new Date(row.expires_at),
        status: row.status,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      row.id
    )
  }
}
