/**
 * Stripe Service
 *
 * Stripe payment integration for checkout.
 */

import Stripe from 'stripe'
import { stripeConfig } from '../../config/stripe'
import type { Order } from '../models'

export class StripeService {
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2023-10-16',
    })
  }

  /**
   * Create Stripe Checkout Session
   */
  async createCheckoutSession(order: Order, baseUrl: string): Promise<Stripe.Checkout.Session> {
    // Mock implementation for development without a real Stripe key
    if (stripeConfig.secretKey === 'sk_test_xxx') {
      console.log(`[Stripe DEBUG] Mocking checkout session for Order #${order.id}`)
      const mockSessionId = `mock_${order.id}_${Date.now()}`
      return {
        id: mockSessionId,
        url: `${baseUrl}/checkout/success?session_id=${mockSessionId}`,
        metadata: {
          order_id: order.id.toString(),
          order_number: order.order_number,
        },
      } as any
    }

    if (!order.items || order.items.length === 0) {
      throw new Error('Order has no items')
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
      price_data: {
        currency: stripeConfig.currency,
        product_data: {
          name: item.product_name,
        },
        unit_amount: item.price, // Already in smallest currency unit
      },
      quantity: item.quantity,
    }))

    // Add shipping as a line item
    if (order.shipping > 0) {
      lineItems.push({
        price_data: {
          currency: stripeConfig.currency,
          product_data: {
            name: '運費',
          },
          unit_amount: order.shipping,
        },
        quantity: 1,
      })
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}${stripeConfig.successUrl}`,
      cancel_url: `${baseUrl}${stripeConfig.cancelUrl}`,
      metadata: {
        order_id: order.id.toString(),
        order_number: order.order_number,
      },
      customer_email: undefined, // Can be pre-filled if user email is available
      billing_address_collection: 'required',
    })

    return session
  }

  /**
   * Verify webhook signature and parse event
   */
  verifyWebhook(payload: string | Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, stripeConfig.webhookSecret)
  }

  /**
   * Retrieve checkout session
   */
  async getSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId)
  }

  /**
   * Process successful payment
   */
  async handlePaymentSuccess(session: Stripe.Checkout.Session): Promise<{
    orderId: number
    paymentIntentId: string
  }> {
    const orderId = parseInt(session.metadata?.order_id || '0', 10)
    const paymentIntentId = session.payment_intent as string

    if (!orderId) {
      throw new Error('Order ID not found in session metadata')
    }

    return { orderId, paymentIntentId }
  }

  /**
   * Create refund for order
   */
  async createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    }

    if (amount) {
      refundParams.amount = amount
    }

    return this.stripe.refunds.create(refundParams)
  }
}
