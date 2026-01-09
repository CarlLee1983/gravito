import type { GravitoContext, PlanetCore } from '@gravito/core'
import Stripe from 'stripe'

export class StripeWebhookController {
  async handle(c: GravitoContext) {
    const core = c.get('core') as PlanetCore
    const stripeKey = core.config.get<string>('payment.stripe.secret') || ''
    const webhookSecret = core.config.get<string>('payment.stripe.webhook_secret') || ''

    const stripe = new Stripe(stripeKey)
    const signature = c.req.header('stripe-signature') || ''

    try {
      const body = await c.req.text()
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object as Stripe.PaymentIntent
        core.logger.info(`[Payment] Webhook: Payment succeeded for ${intent.id}`)

        await core.hooks.doAction('payment:succeeded', {
          gatewayTransactionId: intent.id,
          orderId: intent.metadata.orderId,
          amount: intent.amount / 100,
        })
      }

      return c.json({ received: true })
    } catch (err: any) {
      core.logger.error(`[Payment] Webhook Error: ${err.message}`)
      return c.json({ error: 'Webhook signature verification failed' }, 400)
    }
  }
}
