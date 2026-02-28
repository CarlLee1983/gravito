import type { Category } from '../Entities/Category'
import type { Product, ProductStatus } from '../Entities/Product'

/**
 * 商品篩選條件
 */
export interface ProductFilters {
  status?: ProductStatus
  categoryId?: string
  search?: string
}

export interface ICategoryRepository {
  save(category: Category): Promise<void>
  findById(id: string): Promise<Category | null>
  findBySlug(slug: string): Promise<Category | null>
  findAll(): Promise<Category[]>
  findByParentId(parentId: string | null): Promise<Category[]>
  /** 獲取某路徑下的所有子分類 (用於同步更新) */
  findByPathPrefix(path: string): Promise<Category[]>
  delete(id: string): Promise<void>
}

export interface IProductRepository {
  save(product: Product): Promise<void>
  findById(id: string): Promise<Product | null>
  findBySlug(slug: string): Promise<Product | null>
  findByVariantId(variantId: string): Promise<Product | null>
  findAll(filters?: ProductFilters): Promise<Product[]>
  delete(id: string): Promise<void>
}
