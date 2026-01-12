/**
 * Stripe Payment Configuration
 *
 * Configure Stripe checkout integration for payment processing.
 */

export const stripeConfig = {
  /**
   * Stripe Secret Key
   * Get from: https://dashboard.stripe.com/apikeys
   */
  secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_xxx',

  /**
   * Stripe Webhook Secret
   * Get from: https://dashboard.stripe.com/webhooks
   */
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_xxx',

  /**
   * Checkout Success URL
   * User is redirected here after successful payment
   */
  successUrl: '/checkout/success?session_id={CHECKOUT_SESSION_ID}',

  /**
   * Checkout Cancel URL
   * User is redirected here if they cancel payment
   */
  cancelUrl: '/checkout/cancel',

  /**
   * Currency for all transactions
   */
  currency: 'twd',

  /**
   * Shipping options
   */
  shippingOptions: [
    {
      shipping_rate_data: {
        type: 'fixed_amount' as const,
        fixed_amount: { amount: 6000, currency: 'twd' },
        display_name: '標準配送',
        delivery_estimate: {
          minimum: { unit: 'business_day' as const, value: 3 },
          maximum: { unit: 'business_day' as const, value: 5 },
        },
      },
    },
    {
      shipping_rate_data: {
        type: 'fixed_amount' as const,
        fixed_amount: { amount: 15000, currency: 'twd' },
        display_name: '快速配送',
        delivery_estimate: {
          minimum: { unit: 'business_day' as const, value: 1 },
          maximum: { unit: 'business_day' as const, value: 2 },
        },
      },
    },
  ],
}
