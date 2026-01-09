import type { ConnectionContract } from '@gravito/atlas'
import { DB } from '@gravito/atlas'
import type { IProductRepository } from '../../Domain/Contracts/ICatalogRepository'
import { Product, Variant } from '../../Domain/Entities/Product'

export class AtlasProductRepository implements IProductRepository {
  private productsTable = 'products'
  private variantsTable = 'product_variants'
  private pivotTable = 'category_product'

  async save(product: Product): Promise<void> {
    await DB.transaction(async (db: ConnectionContract) => {
      // 1. 保存商品主體
      const productData = {
        id: product.id,
        name: JSON.stringify(product.name),
        slug: product.slug,
        // @ts-expect-error
        description: product.props.description || null,
        // @ts-expect-error
        brand: product.props.brand || null,
        // @ts-expect-error
        status: product.props.status,
        thumbnail: product.thumbnail || null,
        // @ts-expect-error
        created_at: product.props.createdAt,
        // @ts-expect-error
        updated_at: product.props.updatedAt,
        metadata: JSON.stringify(product.metadata),
      }

      const exists = await db.table(this.productsTable).where('id', product.id).first()
      if (exists) {
        await db.table(this.productsTable).where('id', product.id).update(productData)
      } else {
        await db.table(this.productsTable).insert(productData)
      }

      // 2. 同步變體 (簡單起見，先刪除舊的再插入新的，或實作 upsert)
      await db.table(this.variantsTable).where('product_id', product.id).delete()
      for (const variant of product.variants) {
        await db.table(this.variantsTable).insert({
          id: variant.id,
          product_id: product.id,
          sku: variant.sku,
          // @ts-expect-error
          name: variant.props.name,
          price: variant.price,
          // @ts-expect-error
          compare_at_price: variant.props.compareAtPrice,
          stock: variant.stock,
          options: JSON.stringify(variant.options),
          // @ts-expect-error
          created_at: variant.props.createdAt,
          // @ts-expect-error
          updated_at: variant.props.updatedAt,
          metadata: JSON.stringify(variant.metadata),
        })
      }

      // 3. 同步分類關聯
      await db.table(this.pivotTable).where('product_id', product.id).delete()
      for (const categoryId of product.categoryIds) {
        await db.table(this.pivotTable).insert({
          product_id: product.id,
          category_id: categoryId,
        })
      }
    })
  }

  async findById(id: string): Promise<Product | null> {
    const row = await DB.table(this.productsTable).where('id', id).first()
    if (!row) {
      return null
    }

    const variantRows = await DB.table(this.variantsTable).where('product_id', id).get()
    const categoryRows = await DB.table(this.pivotTable).where('product_id', id).get()

    return this.mapToDomain(row, variantRows, categoryRows)
  }

  async findAll(_filters?: any): Promise<Product[]> {
    const rows = await DB.table(this.productsTable).get()
    const products: Product[] = []

    for (const row of rows) {
      const variantRows = await DB.table(this.variantsTable).where('product_id', row.id).get()
      const categoryRows = await DB.table(this.pivotTable).where('product_id', row.id).get()
      products.push(this.mapToDomain(row, variantRows, categoryRows))
    }

    return products
  }

  async delete(id: string): Promise<void> {
    await DB.transaction(async (db: ConnectionContract) => {
      await db.table(this.pivotTable).where('product_id', id).delete()
      await db.table(this.variantsTable).where('product_id', id).delete()
      await db.table(this.productsTable).where('id', id).delete()
    })
  }

  private mapToDomain(row: any, variantRows: any[], categoryRows: any[]): Product {
    const variants = variantRows.map(
      (v) =>
        new Variant(v.id, {
          productId: v.product_id,
          sku: v.sku,
          name: v.name,
          price: v.price,
          compareAtPrice: v.compare_at_price,
          stock: v.stock,
          options: JSON.parse(v.options),
          createdAt: new Date(v.created_at),
          updatedAt: new Date(v.updated_at || v.created_at),
          metadata: v.metadata ? JSON.parse(v.metadata) : {},
        })
    )

    return Product.reconstitute(row.id, {
      name: JSON.parse(row.name),
      slug: row.slug,
      description: row.description,
      brand: row.brand,
      status: row.status,
      thumbnail: row.thumbnail,
      variants,
      categoryIds: categoryRows.map((c) => c.category_id),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at || row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    })
  }
}
