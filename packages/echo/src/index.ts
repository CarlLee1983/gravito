/**
 * @fileoverview @gravito/echo - Enterprise Webhook Module
 *
 * Secure webhook receiving and reliable webhook sending for Gravito.
 *
 * @example Receiving webhooks
 * ```typescript
 * import { OrbitEcho, WebhookReceiver } from '@gravito/echo'
 *
 * const core = new PlanetCore()
 *
 * core.install(new OrbitEcho({
 *   providers: {
 *     stripe: { name: 'stripe', secret: process.env.STRIPE_WEBHOOK_SECRET! }
 *   }
 * }))
 *
 * const receiver = core.container.make<WebhookReceiver>('echo.receiver')
 * receiver.on('stripe', 'payment_intent.succeeded', async (event) => {
 *   console.log('Payment:', event.payload)
 * })
 * ```
 *
 * @example Sending webhooks
 * ```typescript
 * import { WebhookDispatcher } from '@gravito/echo'
 *
 * const dispatcher = new WebhookDispatcher({
 *   secret: 'my-secret'
 * })
 *
 * await dispatcher.dispatch({
 *   url: 'https://example.com/webhook',
 *   event: 'order.created',
 *   data: { orderId: 123 }
 * })
 * ```
 *
 * @module @gravito/echo
 */

// Core
export { OrbitEcho } from './OrbitEcho'
// Providers
export { GenericProvider } from './providers/GenericProvider'
export { GitHubProvider } from './providers/GitHubProvider'
export { StripeProvider } from './providers/StripeProvider'
export {
  computeHmacSha1,
  computeHmacSha256,
  parseStripeSignature,
  timingSafeEqual,
  validateTimestamp,
} from './receive/SignatureValidator'
// Receiving
export { WebhookReceiver } from './receive/WebhookReceiver'
// Sending
export { WebhookDispatcher } from './send/WebhookDispatcher'

// Types
export type {
  // Config
  EchoConfig,
  RetryConfig,
  WebhookDeliveryResult,
  WebhookDispatcherConfig,
  WebhookEvent,
  WebhookHandler,
  // Sending
  WebhookPayload,
  // Receiving
  WebhookProvider,
  WebhookProviderConfig,
  WebhookVerificationResult,
} from './types'
