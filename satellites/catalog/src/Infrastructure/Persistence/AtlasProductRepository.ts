import type { ConnectionContract } from '@gravito/atlas'
import { DB } from '@gravito/atlas'
import type { IProductRepository, ProductFilters } from '../../Domain/Contracts/ICatalogRepository'
import { Product, type ProductStatus, Variant } from '../../Domain/Entities/Product'
import { I18nText } from '../../Domain/ValueObjects/I18nText'
import { Money } from '../../Domain/ValueObjects/Money'
import { Slug } from '../../Domain/ValueObjects/Slug'
import { Stock } from '../../Domain/ValueObjects/Stock'

export class AtlasProductRepository implements IProductRepository {
  private productsTable = 'products'
  private variantsTable = 'product_variants'
  private pivotTable = 'category_product'

  async save(product: Product): Promise<void> {
    await DB.transaction(async (db: ConnectionContract) => {
      // 1. 保存商品主體
      const productData = {
        id: product.id,
        name: JSON.stringify(product.name.translations),
        slug: product.slug.value,
        description: product.description || null,
        brand: product.brand || null,
        status: product.status,
        thumbnail: product.thumbnail || null,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
        metadata: JSON.stringify(product.metadata),
      }

      const exists = await db.table(this.productsTable).where('id', product.id).first()
      if (exists) {
        await db.table(this.productsTable).where('id', product.id).update(productData)
      } else {
        await db.table(this.productsTable).insert(productData)
      }

      // 2. 同步變體
      await db.table(this.variantsTable).where('product_id', product.id).delete()
      for (const variant of product.variants) {
        await db.table(this.variantsTable).insert({
          id: variant.id,
          product_id: product.id,
          sku: variant.sku,
          name: variant.name,
          price: variant.price.amountInCents,
          compare_at_price: variant.compareAtPrice?.amountInCents || null,
          stock: variant.stock.quantity,
          options: JSON.stringify(variant.options),
          created_at: variant.createdAt,
          updated_at: variant.updatedAt,
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

  async findBySlug(slug: string): Promise<Product | null> {
    const row = await DB.table(this.productsTable).where('slug', slug).first()
    if (!row) {
      return null
    }

    const variantRows = await DB.table(this.variantsTable).where('product_id', row.id).get()
    const categoryRows = await DB.table(this.pivotTable).where('product_id', row.id).get()

    return this.mapToDomain(row, variantRows, categoryRows)
  }

  async findByVariantId(variantId: string): Promise<Product | null> {
    const variant = await DB.table(this.variantsTable).where('id', variantId).first()
    if (!variant) {
      return null
    }
    return this.findById((variant as Record<string, unknown>).product_id as string)
  }

  async findAll(filters?: ProductFilters): Promise<Product[]> {
    let query = DB.table(this.productsTable)

    if (filters?.status) {
      query = query.where('status', filters.status)
    }

    if (filters?.search) {
      query = query.whereRaw('name LIKE ? OR slug LIKE ?', [
        `%${filters.search}%`,
        `%${filters.search}%`,
      ])
    }

    const rows = await query.get()
    const products: Product[] = []

    for (const row of rows) {
      const variantRows = await DB.table(this.variantsTable).where('product_id', row.id).get()

      if (filters?.categoryId) {
        const productInCategory = await DB.table(this.pivotTable)
          .where('product_id', row.id)
          .where('category_id', filters.categoryId)
          .first()

        if (!productInCategory) continue
      }

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

  private mapToDomain(
    row: Record<string, unknown>,
    variantRows: Record<string, unknown>[],
    categoryRows: Record<string, unknown>[]
  ): Product {
    const variants = variantRows.map(
      (v) =>
        new Variant(v.id as string, {
          productId: v.product_id as string,
          sku: v.sku as string,
          name: (v.name as string | null) ?? null,
          price: Money.of((v.price as number) / 100),
          compareAtPrice: v.compare_at_price
            ? Money.of((v.compare_at_price as number) / 100)
            : null,
          stock: Stock.of(v.stock as number),
          options: JSON.parse(v.options as string),
          createdAt: new Date(v.created_at as string),
          updatedAt: new Date((v.updated_at as string) || (v.created_at as string)),
          metadata: v.metadata ? JSON.parse(v.metadata as string) : {},
        })
    )

    return Product.reconstitute(row.id as string, {
      name: I18nText.of(JSON.parse(row.name as string)),
      slug: Slug.of(row.slug as string),
      description: (row.description as string) || undefined,
      brand: (row.brand as string) || undefined,
      status: row.status as ProductStatus,
      thumbnail: (row.thumbnail as string) || undefined,
      variants,
      categoryIds: categoryRows.map((c) => c.category_id as string),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date((row.updated_at as string) || (row.created_at as string)),
      metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
    })
  }
}
