/**
 * Admin Order Controller
 *
 * Order management and status updates.
 */

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import { OrderStatus } from '../../../Models'
import { OrderService } from '../../../Services'

export class AdminOrderController {
  /**
   * Order list
   */
  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const page = parseInt(ctx.req.query('page') || '1', 10)
    const status = ctx.req.query('status') || ''
    const perPage = 20
    const offset = (page - 1) * perPage

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (status) {
      whereClause += ' AND o.status = ?'
      params.push(status)
    }

    const ordersResult = await DB.raw(
      `
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [...params, perPage, offset]
    )

    const countResult = await DB.raw<{ count: number }>(
      `
      SELECT COUNT(*) as count FROM orders o ${whereClause}
    `,
      params
    )

    const total = countResult.rows[0]?.count || 0
    const totalPages = Math.ceil(total / perPage)

    // Status options for filter
    const statusOptions = Object.values(OrderStatus)

    return inertia.render('Admin/Orders/Index', {
      orders: ordersResult.rows.map((order: any) => ({
        ...order,
        formatted_total: `NT$ ${(order.total / 100).toLocaleString()}`,
      })),
      filters: { status },
      statusOptions,
      pagination: { page, perPage, total, totalPages },
    })
  }

  /**
   * Order details
   */
  static async show(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const orderId = parseInt(ctx.req.param('id'), 10)
    const orderService = new OrderService()

    try {
      const order = await orderService.getOrder(orderId)

      // Get user info
      const userResult = await DB.raw<{ id: number; name: string; email: string }>(
        'SELECT id, name, email FROM users WHERE id = ?',
        [order.user_id]
      )

      return inertia.render('Admin/Orders/Show', {
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          total: order.total,
          formatted_total: order.getFormattedTotal(),
          shipping_address: order.getShippingAddress(),
          stripe_session_id: order.stripe_session_id,
          stripe_payment_intent_id: order.stripe_payment_intent_id,
          notes: order.notes,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items:
            order.items?.map((item) => ({
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              price: item.price,
              line_total: item.getLineTotal(),
            })) || [],
        },
        user: userResult.rows[0],
        statusOptions: Object.values(OrderStatus),
      })
    } catch {
      return ctx.notFound()
    }
  }

  /**
   * Update order status
   */
  static async updateStatus(ctx: GravitoContext) {
    const orderId = parseInt(ctx.req.param('id'), 10)
    const body = (await ctx.req.json()) as { status: OrderStatus }

    if (!Object.values(OrderStatus).includes(body.status)) {
      return ctx.json({ error: '無效的訂單狀態' }, 400)
    }

    await DB.raw('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      body.status,
      orderId,
    ])

    // Get status label
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: '待付款',
      [OrderStatus.PAID]: '已付款',
      [OrderStatus.PROCESSING]: '處理中',
      [OrderStatus.SHIPPED]: '已出貨',
      [OrderStatus.DELIVERED]: '已送達',
      [OrderStatus.CANCELLED]: '已取消',
      [OrderStatus.REFUNDED]: '已退款',
    }

    return ctx.json({
      success: true,
      status: body.status,
      status_label: labels[body.status],
    })
  }
}
