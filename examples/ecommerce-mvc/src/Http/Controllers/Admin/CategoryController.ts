/**
 * Admin Category Controller
 *
 * Category CRUD management.
 */

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { InertiaHelper } from '@gravito/ion'
import { Category } from '../../../models'
import { FALSE, sql, TRUE } from '../../../utils/db'

export class AdminCategoryController {
  /**
   * Category list
   */
  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as unknown as InertiaHelper

    const categoriesResult = await DB.raw(
      sql(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = ${TRUE}
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `)
    )

    return inertia.render('Admin/Categories/Index', { categories: categoriesResult.rows })
  }

  /**
   * Store new category
   */
  static async store(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as {
      name: string
      description?: string
      image_url?: string
      is_active: boolean
      sort_order?: number
    }

    if (!body.name || body.name.length < 2) {
      return ctx.json({ errors: { name: ['分類名稱至少需要 2 個字元'] } }, 422)
    }

    const slug = Category.generateSlug(body.name)

    // Check for duplicate slug
    const existingResult = await DB.raw<{ id: number }>(
      sql('SELECT id FROM categories WHERE slug = ?'),
      [slug]
    )
    if (existingResult.rows[0]) {
      return ctx.json({ errors: { name: ['此分類名稱已存在'] } }, 422)
    }

    const _result = await DB.raw<{ id: number }>(
      sql(`
      INSERT INTO categories (name, slug, description, image_url, is_active, sort_order)
      VALUES (?, ?, ?, ?, ${body.is_active ? TRUE : FALSE}, ?)
      RETURNING id
    `),
      [
        body.name,
        slug,
        body.description || null,
        body.image_url || null,
        // is_active handled via literal
        body.sort_order || 0,
      ]
    )

    return ctx.redirect('/admin/categories')
  }

  /**
   * Update category
   */
  static async update(ctx: GravitoContext) {
    const id = parseInt(ctx.req.param('id') || '0', 10)
    const body = (await ctx.req.json()) as {
      name: string
      description?: string
      image_url?: string
      is_active: boolean
      sort_order?: number
    }

    if (!body.name || body.name.length < 2) {
      return ctx.json({ errors: { name: ['分類名稱至少需要 2 個字元'] } }, 422)
    }

    const slug = Category.generateSlug(body.name)

    // Check for duplicate slug (exclude current)
    const existingResult = await DB.raw<{ id: number }>(
      sql('SELECT id FROM categories WHERE slug = ? AND id != ?'),
      [slug, id]
    )
    if (existingResult.rows[0]) {
      return ctx.json({ errors: { name: ['此分類名稱已存在'] } }, 422)
    }

    await DB.raw(
      sql(`
      UPDATE categories SET
        name = ?, slug = ?, description = ?, image_url = ?,
        is_active = ${body.is_active ? TRUE : FALSE}, sort_order = ?
      WHERE id = ?
    `),
      [
        body.name,
        slug,
        body.description || null,
        body.image_url || null,
        // is_active handled via literal
        body.sort_order || 0,
        id,
      ]
    )

    return ctx.redirect('/admin/categories')
  }

  /**
   * Delete category
   */
  static async destroy(ctx: GravitoContext) {
    const id = parseInt(ctx.req.param('id') || '0', 10)

    // Check if category has products
    const productCountResult = await DB.raw<{ count: number }>(
      sql('SELECT COUNT(*) as count FROM products WHERE category_id = ?'),
      [id]
    )

    const count = productCountResult.rows[0]?.count || 0
    if (count > 0) {
      return ctx.json(
        {
          error: `無法刪除：此分類下有 ${count} 個商品`,
        },
        400
      )
    }

    await DB.raw(sql('DELETE FROM categories WHERE id = ?'), [id])

    return ctx.redirect('/admin/categories')
  }
}
