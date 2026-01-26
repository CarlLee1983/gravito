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

export type { DeadLetterEvent, DeadLetterQueue } from './dlq/DeadLetterQueue'
// DLQ
export { MemoryDeadLetterQueue } from './dlq/MemoryDeadLetterQueue'
// Core
export { OrbitEcho } from './OrbitEcho'
// Providers
export { BaseProvider, type ProviderOptions } from './providers/base/BaseProvider'
export { GenericProvider } from './providers/GenericProvider'
export { GitHubProvider } from './providers/GitHubProvider'
export { LinearProvider } from './providers/LinearProvider'
export { PaddleProvider } from './providers/PaddleProvider'
export { ShopifyProvider } from './providers/ShopifyProvider'
export { SlackProvider } from './providers/SlackProvider'
export { StripeProvider } from './providers/StripeProvider'
export { TwilioProvider } from './providers/TwilioProvider'
export {
  computeHmacSha1,
  computeHmacSha256,
  parseStripeSignature,
  timingSafeEqual,
  validateTimestamp,
} from './receive/SignatureValidator'
// Receiving
export { WebhookReceiver } from './receive/WebhookReceiver'
// Replay
export { WebhookReplayService } from './replay/WebhookReplayService'
// Sending
export { WebhookDispatcher } from './send/WebhookDispatcher'
// Storage
export { MemoryWebhookStore } from './storage/MemoryWebhookStore'
export type {
  EventQueryFilter,
  IncomingWebhookRecord,
  OutgoingWebhookRecord,
  WebhookRecord,
  WebhookStore,
} from './storage/WebhookStore'

// Types
export type {
  BatchDispatchOptions,
  BatchDispatchResult,
  // Config
  EchoConfig,
  // Replay
  ReplayOptions,
  ReplayResult,
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
