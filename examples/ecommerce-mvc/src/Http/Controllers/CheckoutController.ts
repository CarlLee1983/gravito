/**
 * Checkout Controller
 *
 * Handle checkout flow and Stripe integration.
 */

import type { OrbitAtlas } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import type { AuthManager } from '@gravito/sentinel'
import type { ShippingAddress } from '../../Models'
import { OrderStatus } from '../../Models'
import { CartService, OrderService, StripeService } from '../../Services'

export class CheckoutController {
  /**
   * Show checkout page
   */
  static async show(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const atlas = ctx.get('atlas') as OrbitAtlas
    const auth = ctx.get('auth') as AuthManager

    const user = await auth.user()
    if (!user) {
      return ctx.redirect('/login')
    }

    const userId = user.getAuthIdentifier() as number
    const cartService = new CartService(atlas)
    const cart = await cartService.getOrCreateCart(userId)

    if (cart.getItemCount() === 0) {
      return ctx.redirect('/cart')
    }

    return inertia.render('Checkout/Index', {
      cart: {
        items:
          cart.items?.map((item) => ({
            id: item.id,
            product: item.product,
            quantity: item.quantity,
            price: item.price,
            line_total: item.getLineTotal(),
          })) || [],
        subtotal: cart.getSubtotal(),
        shipping: 6000, // 60 TWD
        total: cart.getSubtotal() + 6000,
      },
    })
  }

  /**
   * Process checkout - Create order and Stripe session
   */
  static async process(ctx: GravitoContext) {
    const atlas = ctx.get('atlas') as OrbitAtlas
    const auth = ctx.get('auth') as AuthManager

    const user = await auth.user()
    if (!user) {
      return ctx.json({ error: '請先登入' }, 401)
    }

    const body = (await ctx.req.json()) as {
      shipping_address: ShippingAddress
      notes?: string
    }

    const userId = user.getAuthIdentifier() as number
    const cartService = new CartService(atlas)
    const orderService = new OrderService(atlas)
    const _stripeService = new StripeService()

    // Get cart
    const cart = await cartService.getOrCreateCart(userId)
    if (cart.getItemCount() === 0) {
      return ctx.json({ error: '購物車是空的' }, 400)
    }

    try {
      // Create order and clear cart
      const order = await orderService.createOrder({
        userId,
        cartId: cart.id,
        shippingAddress: body.shipping_address,
        notes: body.notes,
      })

      // Return success with redirect to the order detail page
      return ctx.json({
        success: true,
        redirect_url: `/account/orders/${order.id}`,
      })
    } catch (error: any) {
      console.error('Checkout error:', error)
      return ctx.json(
        {
          error: error.message || '結帳處理失敗',
        },
        500
      )
    }
  }

  /**
   * Checkout success page
   */
  static async success(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const atlas = ctx.get('atlas') as OrbitAtlas

    const sessionId = ctx.req.query('session_id')
    if (!sessionId) {
      return ctx.redirect('/')
    }

    const orderService = new OrderService(atlas)
    const order = await orderService.getOrderByStripeSession(sessionId)

    if (!order) {
      return ctx.redirect('/')
    }

    // If it's a mock session, automatically mark it as paid
    if (sessionId.startsWith('mock_')) {
      console.log(
        `[Checkout DEBUG] Mock payment detected for session: ${sessionId}, marking Order #${order.id} as PAID`
      )
      if (order.status === OrderStatus.PENDING) {
        await orderService.markAsPaid(order.id, 'MOCK_PAYMENT_INTENT')
        // Refresh order data
        order.status = OrderStatus.PAID
      }
    }

    return inertia.render('Checkout/Success', {
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        status_label: order.getStatusLabel(),
        total: order.total,
        formatted_total: order.getFormattedTotal(),
        items:
          order.items?.map((item) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
          })) || [],
      },
    })
  }

  /**
   * Checkout cancel page
   */
  static async cancel(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    return inertia.render('Checkout/Cancel')
  }

  /**
   * Stripe webhook handler
   */
  static async handleWebhook(ctx: GravitoContext) {
    const atlas = ctx.get('atlas') as OrbitAtlas
    const stripeService = new StripeService()
    const orderService = new OrderService(atlas)

    const signature = ctx.req.header('stripe-signature')
    if (!signature) {
      return ctx.json({ error: 'Missing signature' }, 400)
    }

    try {
      const payload = await ctx.req.text()
      const event = stripeService.verifyWebhook(payload, signature)

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object
          const { orderId, paymentIntentId } = await stripeService.handlePaymentSuccess(session)
          await orderService.markAsPaid(orderId, paymentIntentId)
          console.log(`✅ Order ${orderId} marked as paid`)
          break
        }

        case 'checkout.session.expired': {
          const session = event.data.object
          const orderId = parseInt(session.metadata?.order_id || '0', 10)
          if (orderId) {
            await orderService.updateStatus(orderId, OrderStatus.CANCELLED)
            console.log(`❌ Order ${orderId} cancelled (session expired)`)
          }
          break
        }
      }

      return ctx.json({ received: true })
    } catch (error: any) {
      console.error('Webhook error:', error.message)
      return ctx.json({ error: error.message }, 400)
    }
  }
}
