/**
 * Admin User Controller
 *
 * User management.
 */

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import { FALSE, sql, TRUE } from '../../../utils/db'

export class AdminUserController {
  /**
   * User list
   */
  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const page = parseInt(ctx.req.query('page') || '1', 10)
    const search = ctx.req.query('search') || ''
    const role = ctx.req.query('role') || ''
    const perPage = 20
    const offset = (page - 1) * perPage

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    if (role) {
      whereClause += ' AND role = ?'
      params.push(role)
    }

    const usersResult = await DB.raw(
      sql(`
      SELECT id, name, email, role, is_active, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `),
      [...params, perPage, offset]
    )

    // Get order counts for each user
    const usersWithStats = await Promise.all(
      usersResult.rows.map(async (user: any) => {
        const orderStatsResult = await DB.raw<{ order_count: number; total_spent: number }>(
          sql(`
          SELECT COUNT(*) as order_count, SUM(total) as total_spent
          FROM orders WHERE user_id = ? AND status != 'cancelled'
        `),
          [user.id]
        )
        const stats = orderStatsResult.rows[0]
        return {
          ...user,
          order_count: stats?.order_count || 0,
          total_spent: stats?.total_spent || 0,
        }
      })
    )

    const countResult = await DB.raw<{ count: number }>(
      sql(`
      SELECT COUNT(*) as count FROM users ${whereClause}
    `),
      params
    )

    const total = countResult.rows[0]?.count || 0
    const totalPages = Math.ceil(total / perPage)

    return inertia.render('Admin/Users/Index', {
      users: usersWithStats,
      filters: { search, role },
      pagination: { page, perPage, total, totalPages },
    })
  }

  /**
   * Toggle user active status
   */
  static async toggleActive(ctx: GravitoContext) {
    const id = parseInt(ctx.req.param('id') || '0', 10)

    // Get current status
    const userResult = await DB.raw<{ is_active: any; role: string }>(
      sql('SELECT is_active, role FROM users WHERE id = ?'),
      [id]
    )
    const user = userResult.rows[0]
    if (!user) {
      return ctx.json({ error: '用戶不存在' }, 404)
    }

    // Prevent disabling admins
    if (user.role === 'admin') {
      return ctx.json({ error: '無法停用管理員帳號' }, 400)
    }

    // Handle different boolean types (SQLite 1/0 vs Postgres true/false)
    const isActive = user.is_active === 1 || user.is_active === true
    const newStatusSql = isActive ? FALSE : TRUE

    await DB.raw(
      sql(
        `UPDATE users SET is_active = ${newStatusSql}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ),
      [id]
    )

    return ctx.json({
      success: true,
      is_active: !isActive,
    })
  }

  /**
   * View user details with orders
   */
  static async show(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const id = parseInt(ctx.req.param('id') || '0', 10)

    const userResult = await DB.raw(
      sql(`
      SELECT id, name, email, role, is_active, created_at
      FROM users WHERE id = ?
    `),
      [id]
    )

    const user = userResult.rows[0]
    if (!user) {
      return ctx.notFound()
    }

    // Get user's orders
    const ordersResult = await DB.raw(
      sql(`
      SELECT id, order_number, status, total, created_at
      FROM orders WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `),
      [id]
    )

    // Get stats
    const statsResult = await DB.raw<{ total_orders: number; total_spent: number }>(
      sql(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) as total_spent
      FROM orders WHERE user_id = ?
    `),
      [id]
    )

    const stats = statsResult.rows[0]

    return inertia.render('Admin/Users/Show', {
      user,
      orders: ordersResult.rows.map((order: any) => ({
        ...order,
        formatted_total: `NT$ ${(order.total / 100).toLocaleString()}`,
      })),
      stats: {
        total_orders: stats?.total_orders || 0,
        total_spent: stats?.total_spent || 0,
      },
    })
  }
}
