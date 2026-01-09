import { DB } from '@gravito/atlas'
import type { ICategoryRepository } from '../../Domain/Contracts/ICatalogRepository'
import { Category } from '../../Domain/Entities/Category'

export class AtlasCategoryRepository implements ICategoryRepository {
  private table = 'categories'

  async save(category: Category): Promise<void> {
    const data = {
      id: category.id,
      parent_id: category.parentId,
      path: category.path,
      name: JSON.stringify(category.name),
      slug: category.slug,
      sort_order: category.sortOrder,
      // @ts-expect-error
      description: category.props.description || null,
      // @ts-expect-error
      created_at: category.props.createdAt,
      // @ts-expect-error
      updated_at: category.props.updatedAt,
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

  async findAll(): Promise<Category[]> {
    const rows = await DB.table(this.table).orderBy('sort_order', 'asc').get()
    return rows.map((row: any) => this.mapToDomain(row))
  }

  async findByParentId(parentId: string | null): Promise<Category[]> {
    const query = DB.table(this.table)
    if (parentId === null) {
      query.whereNull('parent_id')
    } else {
      query.where('parent_id', parentId)
    }
    const rows = await query.orderBy('sort_order', 'asc').get()
    return rows.map((row: any) => this.mapToDomain(row))
  }

  async findByPathPrefix(path: string): Promise<Category[]> {
    // 獲取該路徑下的所有後代
    const rows = await DB.table(this.table).where('path', 'like', `${path}/%`).get()
    return rows.map((row: any) => this.mapToDomain(row))
  }

  async delete(id: string): Promise<void> {
    await DB.table(this.table).where('id', id).delete()
  }

  private mapToDomain(row: any): Category {
    return Category.reconstitute(row.id, {
      parentId: row.parent_id,
      path: row.path,
      name: JSON.parse(row.name),
      slug: row.slug,
      description: row.description,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at || row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    })
  }
}
