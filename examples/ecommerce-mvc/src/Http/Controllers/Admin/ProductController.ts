/**
 * Admin Product Controller
 *
 * Product CRUD management.
 */

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import type { SessionService } from '@gravito/pulsar'
import { Product } from '../../../Models'
import { FALSE, sql, TRUE } from '../../../utils/db'

export class AdminProductController {
  /**
   * Product list
   */
  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const page = parseInt(ctx.req.query('page') || '1', 10)
    const search = ctx.req.query('search') || ''
    const perPage = 15
    const offset = (page - 1) * perPage

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.slug LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    const productsResult = await DB.raw(
      sql(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `),
      [...params, perPage, offset]
    )

    const countResult = await DB.raw<{ count: number }>(
      sql(`
      SELECT COUNT(*) as count FROM products p ${whereClause}
    `),
      params
    )

    const total = countResult.rows[0]?.count || 0
    const totalPages = Math.ceil(total / perPage)

    return inertia.render('Admin/Products/Index', {
      products: productsResult.rows,
      filters: { search },
      pagination: { page, perPage, total, totalPages },
    })
  }

  /**
   * Create product form
   */
  static async create(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const categoriesResult = await DB.raw(
      sql(`SELECT id, name FROM categories WHERE is_active = ${TRUE} ORDER BY name`)
    )

    return inertia.render('Admin/Products/Create', { categories: categoriesResult.rows })
  }

  /**
   * Store new product
   */
  static async store(ctx: GravitoContext) {
    const session = ctx.get('session') as SessionService

    const body = (await ctx.req.json()) as {
      name: string
      category_id?: number
      description?: string
      price: number
      compare_at_price?: number
      stock: number
      image_url?: string
      is_active: boolean
      is_featured: boolean
    }

    const errors: Record<string, string[]> = {}

    if (!body.name || body.name.length < 2) {
      errors.name = ['商品名稱至少需要 2 個字元']
    }

    if (!body.price || body.price < 0) {
      errors.price = ['請輸入有效的價格']
    }

    if (body.stock === undefined || body.stock < 0) {
      errors.stock = ['庫存不能為負數']
    }

    if (Object.keys(errors).length > 0) {
      return ctx.json({ errors }, 422)
    }

    const slug = Product.generateSlug(body.name)
    const price = Math.round(body.price * 100) // Convert to cents
    const compareAtPrice = body.compare_at_price ? Math.round(body.compare_at_price * 100) : null

    await DB.raw(
      sql(`
      INSERT INTO products (name, slug, category_id, description, price, compare_at_price, stock, image_url, is_active, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${body.is_active ? TRUE : FALSE}, ${body.is_featured ? TRUE : FALSE})
    `),
      [
        body.name,
        slug,
        body.category_id || null,
        body.description || null,
        price,
        compareAtPrice,
        body.stock,
        body.image_url || null,
        // is_active, is_featured handled via literal
      ]
    )

    session.flash('success', '商品已新增')
    return ctx.redirect('/admin/products', 303)
  }

  /**
   * Edit product form
   */
  static async edit(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const id = parseInt(ctx.req.param('id') || '0', 10)
    const productResult = await DB.raw(sql('SELECT * FROM products WHERE id = ?'), [id])
    const product = productResult.rows[0]

    if (!product) {
      return ctx.notFound()
    }

    const categoriesResult = await DB.raw(
      sql(`SELECT id, name FROM categories WHERE is_active = ${TRUE} ORDER BY name`)
    )

    return inertia.render('Admin/Products/Edit', {
      product: {
        ...product,
        id: (product as any).id, // Ensure ID is passed explicitly
        price: (product as any).price / 100, // Convert from cents
        compare_at_price: (product as any).compare_at_price
          ? (product as any).compare_at_price / 100
          : null,
      },
      categories: categoriesResult.rows,
    })
  }

  /**
   * Update product
   */
  static async update(ctx: GravitoContext) {
    const session = ctx.get('session') as SessionService

    const id = parseInt(ctx.req.param('id') || '0', 10)
    const body = (await ctx.req.json()) as {
      name: string
      category_id?: number
      description?: string
      price: number
      compare_at_price?: number
      stock: number
      image_url?: string
      is_active: boolean
      is_featured: boolean
    }

    const errors: Record<string, string[]> = {}

    if (!body.name || body.name.length < 2) {
      errors.name = ['商品名稱至少需要 2 個字元']
    }

    if (!body.price || body.price < 0) {
      errors.price = ['請輸入有效的價格']
    }

    if (Object.keys(errors).length > 0) {
      return ctx.json({ errors }, 422)
    }

    const slug = Product.generateSlug(body.name)
    const price = Math.round(body.price * 100)
    const compareAtPrice = body.compare_at_price ? Math.round(body.compare_at_price * 100) : null

    await DB.raw(
      sql(`
      UPDATE products SET
        name = ?, slug = ?, category_id = ?, description = ?,
        price = ?, compare_at_price = ?, stock = ?, image_url = ?,
        is_active = ${body.is_active ? TRUE : FALSE}, is_featured = ${body.is_featured ? TRUE : FALSE}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
      [
        body.name,
        slug,
        body.category_id || null,
        body.description || null,
        price,
        compareAtPrice,
        body.stock,
        body.image_url || null,
        // is_active, is_featured handled via literal
        id,
      ]
    )

    session.flash('success', '商品已更新')
    return ctx.redirect('/admin/products', 303)
  }

  /**
   * Delete product
   */
  static async destroy(ctx: GravitoContext) {
    const id = parseInt(ctx.req.param('id') || '0', 10)
    await DB.raw(sql('DELETE FROM products WHERE id = ?'), [id])

    return ctx.json({ success: true })
  }
}
