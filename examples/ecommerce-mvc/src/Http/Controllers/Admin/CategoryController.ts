/**
 * Admin Category Controller
 *
 * Category CRUD management.
 */

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import { Category } from '../../../Models'

export class AdminCategoryController {
  /**
   * Category list
   */
  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const categoriesResult = await DB.raw(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `)

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
      'SELECT id FROM categories WHERE slug = ?',
      [slug]
    )
    if (existingResult.rows[0]) {
      return ctx.json({ errors: { name: ['此分類名稱已存在'] } }, 422)
    }

    const result = await DB.raw<{ id: number }>(
      `
      INSERT INTO categories (name, slug, description, image_url, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id
    `,
      [
        body.name,
        slug,
        body.description || null,
        body.image_url || null,
        body.is_active ? 1 : 0,
        body.sort_order || 0,
      ]
    )

    return ctx.redirect('/admin/categories')
  }

  /**
   * Update category
   */
  static async update(ctx: GravitoContext) {
    const id = parseInt(ctx.req.param('id'), 10)
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
      'SELECT id FROM categories WHERE slug = ? AND id != ?',
      [slug, id]
    )
    if (existingResult.rows[0]) {
      return ctx.json({ errors: { name: ['此分類名稱已存在'] } }, 422)
    }

    await DB.raw(
      `
      UPDATE categories SET
        name = ?, slug = ?, description = ?, image_url = ?,
        is_active = ?, sort_order = ?
      WHERE id = ?
    `,
      [
        body.name,
        slug,
        body.description || null,
        body.image_url || null,
        body.is_active ? 1 : 0,
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
    const id = parseInt(ctx.req.param('id'), 10)

    // Check if category has products
    const productCountResult = await DB.raw<{ count: number }>(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
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

    await DB.raw('DELETE FROM categories WHERE id = ?', [id])

    return ctx.redirect('/admin/categories')
  }
}
