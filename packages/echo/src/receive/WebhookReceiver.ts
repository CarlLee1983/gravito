/**
 * @fileoverview Webhook Receiver
 *
 * Handles incoming webhooks with signature verification.
 *
 * @module @gravito/echo/receive
 */

import { ConsoleEchoLogger, type EchoLogger } from '../observability/logging'
import {
  EchoMetrics,
  type MetricsProvider,
  NoopMetricsProvider,
  type WebhookMetricLabels,
} from '../observability/metrics'
import { NoopTracer, SpanStatusCode, type Tracer } from '../observability/tracing'
import { GenericProvider } from '../providers/GenericProvider'
import { GitHubProvider } from '../providers/GitHubProvider'
import { LinearProvider } from '../providers/LinearProvider'
import { PaddleProvider } from '../providers/PaddleProvider'
import { ShopifyProvider } from '../providers/ShopifyProvider'
import { SlackProvider } from '../providers/SlackProvider'
import { StripeProvider } from '../providers/StripeProvider'
import { TwilioProvider } from '../providers/TwilioProvider'
import type { WebhookStore } from '../storage/WebhookStore'
import type {
  WebhookEvent,
  WebhookHandler,
  WebhookProvider,
  WebhookVerificationResult,
} from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProviderClass = new (options?: any) => WebhookProvider

/**
 * Webhook Receiver
 *
 * Manages webhook providers and routes incoming webhooks to handlers.
 *
 * @example
 * ```typescript
 * const receiver = new WebhookReceiver()
 *
 * // Register provider
 * receiver.registerProvider('stripe', process.env.STRIPE_WEBHOOK_SECRET!)
 *
 * // Register handler
 * receiver.on('stripe', 'payment_intent.succeeded', async (event) => {
 *   console.log('Payment received:', event.payload)
 * })
 *
 * // Handle incoming webhook
 * const result = await receiver.handle('stripe', body, headers)
 * ```
 */
export class WebhookReceiver {
  private providers = new Map<string, { provider: WebhookProvider; secret: string }>()
  private handlers = new Map<string, Map<string, WebhookHandler[]>>()
  private globalHandlers = new Map<string, WebhookHandler[]>()
  private store?: WebhookStore
  private metrics: MetricsProvider = new NoopMetricsProvider()
  private tracer: Tracer = new NoopTracer()
  private logger: EchoLogger = new ConsoleEchoLogger()

  constructor() {
    // Register built-in providers
    this.registerProviderType('generic', GenericProvider as ProviderClass)
    this.registerProviderType('stripe', StripeProvider as ProviderClass)
    this.registerProviderType('github', GitHubProvider as ProviderClass)
    this.registerProviderType('shopify', ShopifyProvider as ProviderClass)
    this.registerProviderType('twilio', TwilioProvider as ProviderClass)
    this.registerProviderType('slack', SlackProvider as ProviderClass)
    this.registerProviderType('paddle', PaddleProvider as ProviderClass)
    this.registerProviderType('linear', LinearProvider as ProviderClass)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private providerTypes = new Map<string, ProviderClass>()

  /**
   * Set storage backend
   */
  setStore(store: WebhookStore): this {
    this.store = store
    return this
  }

  /**
   * Set Metrics Provider
   */
  setMetrics(metrics: MetricsProvider): this {
    this.metrics = metrics
    return this
  }

  /**
   * Set Tracer
   */
  setTracer(tracer: Tracer): this {
    this.tracer = tracer
    return this
  }

  /**
   * Set Logger
   */
  setLogger(logger: EchoLogger): this {
    this.logger = logger
    return this
  }

  /**
   * Register a custom provider type
   */
  registerProviderType(name: string, ProviderCls: ProviderClass): this {
    this.providerTypes.set(name, ProviderCls)
    return this
  }

  /**
   * Register a provider with its secret
   */
  registerProvider(
    name: string,
    secret: string,
    options?: { type?: string; tolerance?: number }
  ): this {
    const type = options?.type ?? name
    const ProviderClass = this.providerTypes.get(type)

    if (!ProviderClass) {
      throw new Error(`Unknown provider type: ${type}`)
    }

    const provider = new ProviderClass({ tolerance: options?.tolerance })
    this.providers.set(name, { provider, secret })
    return this
  }

  /**
   * Register an event handler
   */
  on<T = unknown>(providerName: string, eventType: string, handler: WebhookHandler<T>): this {
    if (!this.handlers.has(providerName)) {
      this.handlers.set(providerName, new Map())
    }

    const providerHandlers = this.handlers.get(providerName)!
    if (!providerHandlers.has(eventType)) {
      providerHandlers.set(eventType, [])
    }

    providerHandlers.get(eventType)?.push(handler as WebhookHandler)
    return this
  }

  /**
   * Register a handler for all events from a provider
   */
  onAll<T = unknown>(providerName: string, handler: WebhookHandler<T>): this {
    if (!this.globalHandlers.has(providerName)) {
      this.globalHandlers.set(providerName, [])
    }

    this.globalHandlers.get(providerName)?.push(handler as WebhookHandler)
    return this
  }

  /**
   * Handle an incoming webhook
   */
  async handle(
    providerName: string,
    body: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookVerificationResult & { handled: boolean; eventId?: string }> {
    return this.tracer.withSpan('echo.receive_webhook', async (span) => {
      const startTime = performance.now()
      const labels: WebhookMetricLabels = { provider: providerName }

      span.setAttributes({
        'echo.provider': providerName,
        'echo.direction': 'incoming',
      })

      this.logger.debug('Webhook received', {
        component: 'receiver',
        provider: providerName,
      })

      try {
        const config = this.providers.get(providerName)
        if (!config) {
          const error = `Provider not registered: ${providerName}`
          this.logger.warn('Webhook provider not registered', {
            component: 'receiver',
            provider: providerName,
          })
          span.setStatus({ code: SpanStatusCode.ERROR, message: error })
          return {
            valid: false,
            error,
            handled: false,
          }
        }

        const { provider, secret } = config

        // Verify webhook
        span.addEvent('verification_start')
        const result = await provider.verify(body, headers, secret)

        if (!result.valid) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: result.error })
          span.setAttribute('echo.error', result.error ?? 'unknown')

          this.metrics.increment(EchoMetrics.INCOMING_VERIFICATION_FAILURES, {
            provider: providerName,
            error_type: this.categorizeError(result.error),
          })

          this.logger.warn('Webhook verification failed', {
            component: 'receiver',
            provider: providerName,
            error: result.error,
          })

          return { ...result, handled: false }
        }

        span.addEvent('verification_success')
        span.setAttributes({
          'echo.event_type': result.eventType ?? 'unknown',
          'echo.webhook_id': result.webhookId ?? '',
        })

        this.logger.info('Webhook verified successfully', {
          component: 'receiver',
          provider: providerName,
          eventType: result.eventType,
          webhookId: result.webhookId,
        })

        labels.event_type = result.eventType
        labels.status = 'success'

        // Store event
        let eventId: string | undefined
        if (this.store) {
          eventId = await this.store.saveIncomingEvent({
            provider: providerName,
            eventType: result.eventType ?? 'unknown',
            payload: result.payload,
            headers: Object.fromEntries(
              Object.entries(headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
            ),
            rawBody: typeof body === 'string' ? body : body.toString('utf-8'),
            receivedAt: new Date(),
            status: 'pending',
          })
        }

        // Create event object
        const event: WebhookEvent = {
          provider: providerName,
          type: result.eventType ?? 'unknown',
          payload: result.payload,
          headers,
          rawBody: typeof body === 'string' ? body : body.toString('utf-8'),
          receivedAt: new Date(),
          id: result.webhookId,
        }

        try {
          // Call handlers
          let handled = false
          let handlerCount = 0

          span.addEvent('handlers_start')

          // Call event-specific handlers
          const providerHandlers = this.handlers.get(providerName)
          if (providerHandlers) {
            const eventHandlers = providerHandlers.get(event.type)
            if (eventHandlers) {
              for (const handler of eventHandlers) {
                await handler(event)
                handled = true
                handlerCount++
              }
            }
          }

          // Call global handlers
          const globalHandlers = this.globalHandlers.get(providerName)
          if (globalHandlers) {
            for (const handler of globalHandlers) {
              await handler(event)
              handled = true
              handlerCount++
            }
          }

          span.addEvent('handlers_complete', { handler_count: handlerCount })

          if (this.store && eventId) {
            await this.store.markProcessed(eventId)
          }

          this.logger.debug('Webhook processing complete', {
            component: 'receiver',
            provider: providerName,
            eventType: result.eventType,
            handlersInvoked: handlerCount,
          })

          span.setStatus({ code: SpanStatusCode.OK })
          return { ...result, handled, eventId }
        } catch (error) {
          if (this.store && eventId) {
            await this.store.markFailed(eventId, String(error))
          }
          throw error
        }
      } catch (error) {
        labels.status = 'failure'
        labels.error_type = error instanceof Error ? error.name : 'unknown'
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) })
        throw error
      } finally {
        const duration = (performance.now() - startTime) / 1000
        this.metrics.increment(EchoMetrics.INCOMING_TOTAL, labels as Record<string, string>)
        this.metrics.histogram(
          EchoMetrics.INCOMING_DURATION,
          duration,
          labels as Record<string, string>
        )
      }
    })
  }

  private categorizeError(error?: string): string {
    if (!error) return 'unknown'
    if (error.includes('Missing')) return 'missing_header'
    if (error.includes('Signature')) return 'signature_invalid'
    if (error.includes('Timestamp')) return 'timestamp_invalid'
    return 'other'
  }

  /**
   * Verify a webhook without handling
   */
  async verify(
    providerName: string,
    body: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookVerificationResult> {
    const config = this.providers.get(providerName)
    if (!config) {
      return {
        valid: false,
        error: `Provider not registered: ${providerName}`,
      }
    }

    return config.provider.verify(body, headers, config.secret)
  }
}
