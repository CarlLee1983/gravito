import { DB } from '@gravito/atlas'
import type { ICategoryRepository } from '../../Domain/Contracts/ICatalogRepository'
import { Category } from '../../Domain/Entities/Category'
import { I18nText } from '../../Domain/ValueObjects/I18nText'
import { Slug } from '../../Domain/ValueObjects/Slug'

export class AtlasCategoryRepository implements ICategoryRepository {
  private table = 'categories'

  async save(category: Category): Promise<void> {
    const data = {
      id: category.id,
      parent_id: category.parentId,
      path: category.path,
      name: JSON.stringify(category.name.translations),
      slug: category.slug.value,
      sort_order: category.sortOrder,
      description: category.description || null,
      created_at: category.createdAt,
      updated_at: category.updatedAt,
      metadata: JSON.stringify(category.metadata),
    }

    const exists = await DB.table(this.table).where('id', category.id).first()
    if (exists) {
      await DB.table(this.table).where('id', category.id).update(data)
    } else {
      await DB.table(this.table).insert(data)
    }
  }

  async findById(id: string): Promise<Category | null> {
    const row = await DB.table(this.table).where('id', id).first()
    return row ? this.mapToDomain(row) : null
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const row = await DB.table(this.table).where('slug', slug).first()
    return row ? this.mapToDomain(row) : null
  }

  async findAll(): Promise<Category[]> {
    const rows = await DB.table(this.table).orderBy('sort_order', 'asc').get()
    return rows.map((row: Record<string, unknown>) => this.mapToDomain(row))
  }

  async findByParentId(parentId: string | null): Promise<Category[]> {
    let query = DB.table(this.table)
    if (parentId === null) {
      query = query.whereNull('parent_id')
    } else {
      query = query.where('parent_id', parentId)
    }
    const rows = await query.orderBy('sort_order', 'asc').get()
    return rows.map((row: Record<string, unknown>) => this.mapToDomain(row))
  }

  async findByPathPrefix(path: string): Promise<Category[]> {
    const rows = await DB.table(this.table).where('path', 'like', `${path}/%`).get()
    return rows.map((row: Record<string, unknown>) => this.mapToDomain(row))
  }

  async delete(id: string): Promise<void> {
    await DB.table(this.table).where('id', id).delete()
  }

  private mapToDomain(row: Record<string, unknown>): Category {
    return Category.reconstitute(row.id as string, {
      parentId: (row.parent_id as string | null) || null,
      path: (row.path as string) || null,
      name: I18nText.of(JSON.parse(row.name as string)),
      slug: Slug.of(row.slug as string),
      description: (row.description as string) || undefined,
      sortOrder: row.sort_order as number,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date((row.updated_at as string) || (row.created_at as string)),
      metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
    })
  }
}
