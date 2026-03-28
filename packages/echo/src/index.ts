/**
 * @fileoverview \@gravito/echo - Enterprise Webhook Orchestration
 *
 * Echo provides a secure, reliable, and observable layer for handling webhooks
 * in Gravito applications. It standardizes incoming webhook reception with
 * signature verification and dynamic key rotation, while ensuring reliable
 * outgoing delivery via exponential backoff and circuit breaking.
 *
 * @example Receiving webhooks from Stripe
 * ```typescript
 * import { OrbitEcho, WebhookReceiver } from '@gravito/echo'
 *
 * const core = new PlanetCore()
 * core.install(new OrbitEcho({
 *   providers: {
 *     stripe: { name: 'stripe', secret: process.env.STRIPE_SECRET! }
 *   }
 * }))
 *
 * const receiver = core.container.make<WebhookReceiver>('echo.receiver')
 * receiver.on('stripe', 'payment_intent.succeeded', async (event) => {
 *   // Securely process validated payment
 * })
 * ```
 *
 * @example Dispatching reliable outgoing webhooks
 * ```typescript
 * import { WebhookDispatcher } from '@gravito/echo'
 *
 * const dispatcher = new WebhookDispatcher({ secret: 'app-secret' })
 * await dispatcher.dispatch({
 *   url: 'https://consumer.com/hook',
 *   event: 'order.created',
 *   data: { id: 123 }
 * })
 * ```
 *
 * @module @gravito/echo
 */

export type { DeadLetterEvent, DeadLetterQueue } from './dlq/DeadLetterQueue'
// Errors
export { EchoError } from './errors/EchoError'
export { EchoErrorCodes } from './errors/codes'
export type { EchoErrorCode } from './errors/codes'
// DLQ
export { MemoryDeadLetterQueue } from './dlq/MemoryDeadLetterQueue'
// Middleware
export { createRequestBufferMiddleware, RequestBufferMiddleware } from './middleware'
// Core
export { OrbitEcho } from './OrbitEcho'
export type { EchoLogEvent, EchoLogger } from './observability/logging'
export { ConsoleEchoLogger } from './observability/logging'
export type { MetricsProvider, WebhookMetricLabels } from './observability/metrics'
// Observability
export {
  EchoMetrics,
  NoopMetricsProvider,
  PrometheusMetricsProvider,
} from './observability/metrics'
export type { Span, SpanOptions, Tracer } from './observability/tracing'
export { NoopSpan, NoopTracer, SpanStatusCode } from './observability/tracing'
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
// Resilience
export { CircuitBreaker } from './resilience'
// Rotation
export { KeyRotationManager } from './rotation'

// Types
export type {
  // Middleware
  BufferedRequest,
  // Resilience
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  CircuitBreakerState,
  // Config
  EchoConfig,
  EchoObservabilityConfig,
  // Rotation
  KeyRotationConfig,
  ProviderKeyEntry,
  // Replay
  ReplayOptions,
  ReplayResult,
  RequestBufferConfig,
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
  WebhookProviderConfigWithRotation,
  WebhookVerificationResult,
} from './types'
