/**
 * Order Controller
 *
 * Customer order history and details.
 */

import type { OrbitAtlas } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { InertiaHelper } from '@gravito/ion'
import type { AuthManager } from '@gravito/sentinel'
import { OrderStatus } from '../../models'
import { OrderService, StripeService } from '../../Services'

export class OrderController {
  /**
   * Process payment for an existing order
   */
  static async pay(ctx: GravitoContext) {
    const atlas = ctx.get('atlas') as OrbitAtlas
    const auth = ctx.get('auth') as AuthManager
    const stripeService = new StripeService()
    const orderService = new OrderService(atlas)

    const user = await auth.user()
    if (!user) {
      return ctx.json({ error: '請先登入' }, 401)
    }

    const userId = user.getAuthIdentifier() as number
    const orderId = parseInt(ctx.req.param('id') || '', 10)
    const order = await orderService.getOrder(orderId)

    // Verify ownership and status
    if (order.user_id !== userId) {
      return ctx.json({ error: '訂單不存在' }, 404)
    }

    if (order.status !== OrderStatus.PENDING) {
      return ctx.json({ error: '此訂單不處於待付款狀態' }, 400)
    }

    try {
      const baseUrl = new URL(ctx.req.url).origin
      const session = await stripeService.createCheckoutSession(order, baseUrl)

      // Update order with Stripe session ID
      await orderService.updateStripeSession(order.id, session.id)

      return ctx.json({
        success: true,
        checkout_url: session.url,
      })
    } catch (error: any) {
      return ctx.json({ error: error.message || '無法發起支付' }, 500)
    }
  }
  /**
   * Order history
   */
  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as unknown as InertiaHelper
    const atlas = ctx.get('atlas') as OrbitAtlas
    const auth = ctx.get('auth') as AuthManager

    const user = await auth.user()
    if (!user) {
      return ctx.redirect('/login')
    }

    const userId = user.getAuthIdentifier() as number
    const page = parseInt(ctx.req.query('page') || '1', 10)

    const orderService = new OrderService(atlas)
    const { orders, total, totalPages } = await orderService.getUserOrders(userId, page)

    return inertia.render('Account/Orders', {
      orders: orders.map((order) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        status_label: order.getStatusLabel(),
        total: order.total,
        formatted_total: order.getFormattedTotal(),
        created_at: order.created_at,
      })),
      pagination: { page, total, totalPages },
    })
  }

  /**
   * Order details
   */
  static async show(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as unknown as InertiaHelper
    const atlas = ctx.get('atlas') as OrbitAtlas
    const auth = ctx.get('auth') as AuthManager

    const user = await auth.user()
    if (!user) {
      return ctx.redirect('/login')
    }

    const userId = user.getAuthIdentifier() as number
    const orderId = parseInt(ctx.req.param('id') || '', 10)

    const orderService = new OrderService(atlas)
    const order = await orderService.getOrder(orderId)

    // Verify order belongs to user
    if (order.user_id !== userId) {
      return ctx.notFound()
    }

    return inertia.render('Account/OrderDetail', {
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        status_label: order.getStatusLabel(),
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        formatted_total: order.getFormattedTotal(),
        shipping_address: order.getShippingAddress(),
        notes: order.notes,
        created_at: order.created_at,
        items:
          order.items?.map((item) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            line_total: item.getLineTotal(),
          })) || [],
      },
    })
  }

  /**
   * Cancel order
   */
  static async cancel(ctx: GravitoContext) {
    const atlas = ctx.get('atlas') as OrbitAtlas
    const auth = ctx.get('auth') as AuthManager

    const user = await auth.user()
    if (!user) {
      return ctx.json({ error: '請先登入' }, 401)
    }

    const userId = user.getAuthIdentifier() as number
    const orderId = parseInt(ctx.req.param('id') || '', 10)

    const orderService = new OrderService(atlas)
    const order = await orderService.getOrder(orderId)

    // Verify order belongs to user
    if (order.user_id !== userId) {
      return ctx.json({ error: '訂單不存在' }, 404)
    }

    try {
      await orderService.cancelOrder(orderId)
      return ctx.json({ success: true, message: '訂單已取消' })
    } catch (error: any) {
      return ctx.json({ error: error.message || '無法取消訂單' }, 400)
    }
  }
}
