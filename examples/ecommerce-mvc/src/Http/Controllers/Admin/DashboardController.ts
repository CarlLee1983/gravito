/**
 * Admin Dashboard Controller
 *
 * Admin dashboard with statistics.
 */

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { InertiaHelper } from '@gravito/ion'
import { sql, TRUE } from '../../../utils/db'

export class DashboardController {
  /**
   * Admin dashboard
   */
  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as unknown as InertiaHelper

    // Get stats
    const [
      totalProductsResult,
      totalOrdersResult,
      totalUsersResult,
      totalRevenueResult,
      recentOrdersResult,
      ordersByStatusResult,
    ] = await Promise.all([
      DB.raw<{ count: number }>(
        sql(`SELECT COUNT(*) as count FROM products WHERE is_active = ${TRUE}`)
      ),
      DB.raw<{ count: number }>(sql('SELECT COUNT(*) as count FROM orders')),
      DB.raw<{ count: number }>(sql('SELECT COUNT(*) as count FROM users WHERE role = ?'), [
        'customer',
      ]),
      DB.raw<{ total: number }>(
        sql('SELECT SUM(total) as total FROM orders WHERE status IN (?, ?, ?, ?)'),
        ['paid', 'processing', 'shipped', 'delivered']
      ),
      DB.raw(
        sql(`
        SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 5
      `)
      ),
      DB.raw<{ status: string; count: number }>(
        sql(`
        SELECT status, COUNT(*) as count
        FROM orders
        GROUP BY status
      `)
      ),
    ])

    // Today's orders
    const today = new Date().toISOString().split('T')[0]
    const todayOrdersResult = await DB.raw<{ count: number; revenue: number }>(
      sql('SELECT COUNT(*) as count, SUM(total) as revenue FROM orders WHERE date(created_at) = ?'),
      [today]
    )

    return inertia.render('Admin/Dashboard', {
      stats: {
        totalProducts: totalProductsResult.rows[0]?.count || 0,
        totalOrders: totalOrdersResult.rows[0]?.count || 0,
        totalUsers: totalUsersResult.rows[0]?.count || 0,
        totalRevenue: totalRevenueResult.rows[0]?.total || 0,
        todayOrders: todayOrdersResult.rows[0]?.count || 0,
        todayRevenue: todayOrdersResult.rows[0]?.revenue || 0,
      },
      recentOrders: recentOrdersResult.rows.map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total: order.total,
        user_name: order.user_name,
        user_email: order.user_email,
        created_at: order.created_at,
      })),
      ordersByStatus: ordersByStatusResult.rows.reduce((acc: any, row: any) => {
        acc[row.status] = row.count
        return acc
      }, {}),
    })
  }
}
