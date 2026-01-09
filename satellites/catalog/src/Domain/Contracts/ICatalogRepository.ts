import type { Category } from '../Entities/Category'
import type { Product } from '../Entities/Product'

export interface ICategoryRepository {
  save(category: Category): Promise<void>
  findById(id: string): Promise<Category | null>
  findAll(): Promise<Category[]>
  findByParentId(parentId: string | null): Promise<Category[]>
  /** 獲取某路徑下的所有子分類 (用於同步更新) */
  findByPathPrefix(path: string): Promise<Category[]>
  delete(id: string): Promise<void>
}

export interface IProductRepository {
  save(product: Product): Promise<void>
  findById(id: string): Promise<Product | null>
  findAll(filters?: any): Promise<Product[]>
  delete(id: string): Promise<void>
}
