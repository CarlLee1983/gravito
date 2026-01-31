/**
 * @fileoverview Webhook Receiver
 *
 * Handles incoming webhooks with signature verification.
 *
 * @module @gravito/echo/receive
 */

import type { GravitoContext } from '@gravito/core'
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
import type { KeyRotationManager } from '../rotation/KeyRotationManager'
import type { WebhookStore } from '../storage/WebhookStore'
import type {
  BufferedRequest,
  ProviderKeyEntry,
  WebhookEvent,
  WebhookHandler,
  WebhookProvider,
  WebhookVerificationResult,
} from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProviderClass = new (options?: Record<string, unknown>) => WebhookProvider

/**
 * WebhookReceiver orchestrates the end-to-end lifecycle of incoming webhooks.
 *
 * It acts as the central intake for all incoming requests, managing provider-specific
 * verification logic, multi-key rotation checks, persistent storage for auditing,
 * and routing validated events to their respective application-level handlers.
 *
 * @example Basic usage with Stripe
 * ```typescript
 * const receiver = new WebhookReceiver();
 *
 * // Register Stripe with its signing secret
 * receiver.registerProvider('stripe', 'whsec_...');
 *
 * // Listen for payment success events
 * receiver.on('stripe', 'payment_intent.succeeded', async (event) => {
 *   const payment = event.payload;
 *   await processPayment(payment.id);
 * });
 * ```
 *
 * @public
 */
export class WebhookReceiver {
  private providers = new Map<string, { provider: WebhookProvider; secret: string }>()
  private handlers = new Map<string, Map<string, WebhookHandler[]>>()
  private globalHandlers = new Map<string, WebhookHandler[]>()
  private store?: WebhookStore
  private metrics: MetricsProvider = new NoopMetricsProvider()
  private tracer: Tracer = new NoopTracer()
  private logger: EchoLogger = new ConsoleEchoLogger()
  private keyRotationManager?: KeyRotationManager

  /**
   * Initializes the receiver and registers the suite of built-in providers.
   * Built-in providers include Stripe, GitHub, Shopify, Twilio, Slack, and others.
   */
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
   * Assigns a storage engine for persisting and auditing incoming webhook data.
   *
   * @param store - Implementation of the WebhookStore interface.
   * @returns The current instance for method chaining.
   */
  setStore(store: WebhookStore): this {
    this.store = store
    return this
  }

  /**
   * Configures the metrics provider for performance and error monitoring.
   *
   * @param metrics - Implementation of the MetricsProvider interface.
   * @returns The current instance for method chaining.
   */
  setMetrics(metrics: MetricsProvider): this {
    this.metrics = metrics
    return this
  }

  /**
   * Configures the tracer for end-to-end request observability.
   *
   * @param tracer - Implementation of the Tracer interface.
   * @returns The current instance for method chaining.
   */
  setTracer(tracer: Tracer): this {
    this.tracer = tracer
    return this
  }

  /**
   * Configures the logger for diagnostic and security audit logging.
   *
   * @param logger - Implementation of the EchoLogger interface.
   * @returns The current instance for method chaining.
   */
  setLogger(logger: EchoLogger): this {
    this.logger = logger
    return this
  }

  /**
   * Attaches a key rotation manager for handling dynamic secret updates.
   *
   * @param manager - Instance of KeyRotationManager.
   * @returns The current instance for method chaining.
   */
  setKeyRotationManager(manager: KeyRotationManager): this {
    this.keyRotationManager = manager
    return this
  }

  /**
   * Extends the receiver with a custom webhook provider implementation.
   *
   * Use this to add support for services not included in the built-in provider set.
   *
   * @param name - Unique identifier for the provider type (e.g., 'custom-crm').
   * @param ProviderCls - Constructor for the class implementing WebhookProvider.
   * @returns The current instance for method chaining.
   */
  registerProviderType(name: string, ProviderCls: ProviderClass): this {
    this.providerTypes.set(name, ProviderCls)
    return this
  }

  /**
   * Configures a named provider instance with its security credentials.
   *
   * @param name - Unique identifier for this provider instance (used in routing).
   * @param secret - The shared secret used to verify incoming request signatures.
   * @param options - Settings like the provider type and signature time tolerance.
   * @returns The current instance for method chaining.
   * @throws {Error} If the specified provider type has not been registered.
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
   * Registers a provider instance with support for multiple secrets and rotation.
   *
   * This is the preferred registration method for high-availability environments
   * where zero-downtime key rotation is required.
   *
   * @param name - Unique identifier for this provider instance.
   * @param keys - A list of valid keys (active and pending) for this provider.
   * @param options - Settings like the provider type and signature time tolerance.
   * @returns The current instance for method chaining.
   * @throws {Error} If KeyRotationManager is not set or the provider type is unknown.
   */
  registerProviderWithRotation(
    name: string,
    keys: ProviderKeyEntry[],
    options?: { type?: string; tolerance?: number }
  ): this {
    if (!this.keyRotationManager) {
      throw new Error('KeyRotationManager must be set before using key rotation')
    }

    const type = options?.type ?? name
    const ProviderClass = this.providerTypes.get(type)

    if (!ProviderClass) {
      throw new Error(`Unknown provider type: ${type}`)
    }

    // Register keys with rotation manager
    this.keyRotationManager.registerKeys(name, keys)

    // Get primary key for initial registration
    const primaryKey = this.keyRotationManager.getPrimaryKey(name)
    if (!primaryKey) {
      throw new Error(`No primary key found for provider ${name}`)
    }

    const provider = new ProviderClass({ tolerance: options?.tolerance })
    this.providers.set(name, { provider, secret: primaryKey.key })

    return this
  }

  /**
   * Subscribes a handler function to a specific event type from a provider.
   *
   * @param providerName - The name of the registered provider instance.
   * @param eventType - The exact semantic type of the event (e.g., 'order.placed').
   * @param handler - The asynchronous function to execute when a matching event arrives.
   * @returns The current instance for method chaining.
   */
  on<T = unknown>(providerName: string, eventType: string, handler: WebhookHandler<T>): this {
    if (!this.handlers.has(providerName)) {
      this.handlers.set(providerName, new Map())
    }

    const providerHandlers = this.handlers.get(providerName)
    if (!providerHandlers) {
      const newHandlers = new Map()
      this.handlers.set(providerName, newHandlers)
      return this.on(providerName, eventType, handler)
    }

    if (!providerHandlers.has(eventType)) {
      providerHandlers.set(eventType, [])
    }

    providerHandlers.get(eventType)?.push(handler as WebhookHandler)
    return this
  }

  /**
   * Subscribes a catch-all handler for all valid events from a specific provider.
   *
   * @param providerName - The name of the registered provider instance.
   * @param handler - Function to execute for every authenticated event from this provider.
   * @returns The current instance for method chaining.
   */
  onAll<T = unknown>(providerName: string, handler: WebhookHandler<T>): this {
    if (!this.globalHandlers.has(providerName)) {
      this.globalHandlers.set(providerName, [])
    }

    this.globalHandlers.get(providerName)?.push(handler as WebhookHandler)
    return this
  }

  /**
   * Orchestrates the verification and asynchronous processing of an incoming webhook.
   *
   * This is the main entry point for requests. It performs the following:
   * 1. Signature validation (supporting multi-key fallback if rotation is enabled).
   * 2. Event persistence to storage for audit trails.
   * 3. Execution of all matching event-specific and global handlers.
   * 4. Automatic instrumentation for metrics and tracing.
   *
   * @param providerName - The name of the provider instance targeted by the request.
   * @param body - The raw request body as received from the socket.
   * @param headers - Complete set of HTTP headers for signature extraction.
   * @param context - Optional Gravito context for accessing buffered requests.
   * @returns Verification status, event metadata, and processing result.
   * @throws {Error} If handler execution or event storage fails.
   */
  async handle(
    providerName: string,
    body: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    context?: GravitoContext
  ): Promise<WebhookVerificationResult & { handled: boolean; eventId?: string }> {
    // Prefer buffered body from middleware if available
    const buffered = context?.get('bufferedRequest') as BufferedRequest | undefined
    const actualBody = buffered?.rawBody ?? body
    const actualHeaders = buffered?.headers ?? headers

    return this.tracer.withSpan('echo.receive_webhook', async (span) => {
      const startTime = performance.now()
      const labels: WebhookMetricLabels = { provider: providerName }

      span.setAttributes({
        'echo.provider': providerName,
        'echo.direction': 'incoming',
        'echo.buffered': buffered !== undefined,
      })

      this.logger.debug('Webhook received', {
        component: 'receiver',
        provider: providerName,
        buffered: buffered !== undefined,
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

        // Verify webhook using buffered body if available
        span.addEvent('verification_start')

        // Try multi-key verification if rotation is enabled
        let result: WebhookVerificationResult = {
          valid: false,
          error: 'No verification performed',
        }

        if (this.keyRotationManager?.hasProvider(providerName)) {
          const activeKeys = this.keyRotationManager.getActiveKeys(providerName)

          // Try each active key until one succeeds
          let verified = false
          for (const keyEntry of activeKeys) {
            const attemptResult = await provider.verify(actualBody, actualHeaders, keyEntry.key)
            if (attemptResult.valid) {
              result = attemptResult
              verified = true

              // Log if using non-primary key
              if (!keyEntry.isPrimary) {
                this.logger.info('Webhook verified with non-primary key', {
                  component: 'receiver',
                  provider: providerName,
                  keyVersion: keyEntry.version,
                })
              }
              break
            }
          }

          if (!verified) {
            result = {
              valid: false,
              error: 'Signature verification failed with all active keys',
            }
          }
        } else {
          // Fallback to single key verification
          result = await provider.verify(actualBody, actualHeaders, secret)
        }

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
              Object.entries(actualHeaders).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
            ),
            rawBody: typeof actualBody === 'string' ? actualBody : actualBody.toString('utf-8'),
            receivedAt: new Date(),
            status: 'pending',
          })
        }

        // Create event object
        const event: WebhookEvent = {
          provider: providerName,
          type: result.eventType ?? 'unknown',
          payload: result.payload,
          headers: actualHeaders,
          rawBody: typeof actualBody === 'string' ? actualBody : actualBody.toString('utf-8'),
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

  /**
   * Internal utility to categorize verification errors for metrics reporting.
   *
   * @param error - The raw error message from the provider or rotation manager.
   * @returns A semantic error category string (e.g., 'missing_header', 'signature_invalid').
   */
  private categorizeError(error?: string): string {
    if (!error) {
      return 'unknown'
    }
    if (error.includes('Missing')) {
      return 'missing_header'
    }
    if (error.includes('Signature')) {
      return 'signature_invalid'
    }
    if (error.includes('Timestamp')) {
      return 'timestamp_invalid'
    }
    return 'other'
  }

  /**
   * Performs a standalone signature verification without triggering side-effects.
   *
   * This method verifies the authenticity of a webhook request without persisting it
   * to storage or executing any registered handlers. Useful for pre-validation logic.
   *
   * @param providerName - The identifier of the provider instance to use for verification.
   * @param body - The raw request body.
   * @param headers - The incoming HTTP headers.
   * @returns A promise resolving to the verification result.
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
