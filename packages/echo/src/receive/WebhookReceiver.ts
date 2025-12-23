/**
 * @fileoverview Webhook Receiver
 *
 * Handles incoming webhooks with signature verification.
 *
 * @module @gravito/echo/receive
 */

import { GenericProvider } from '../providers/GenericProvider'
import { GitHubProvider } from '../providers/GitHubProvider'
import { StripeProvider } from '../providers/StripeProvider'
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

  constructor() {
    // Register built-in providers
    this.registerProviderType('generic', GenericProvider as ProviderClass)
    this.registerProviderType('stripe', StripeProvider as ProviderClass)
    this.registerProviderType('github', GitHubProvider as ProviderClass)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private providerTypes = new Map<string, ProviderClass>()

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

    providerHandlers.get(eventType)!.push(handler as WebhookHandler)
    return this
  }

  /**
   * Register a handler for all events from a provider
   */
  onAll<T = unknown>(providerName: string, handler: WebhookHandler<T>): this {
    if (!this.globalHandlers.has(providerName)) {
      this.globalHandlers.set(providerName, [])
    }

    this.globalHandlers.get(providerName)!.push(handler as WebhookHandler)
    return this
  }

  /**
   * Handle an incoming webhook
   */
  async handle(
    providerName: string,
    body: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookVerificationResult & { handled: boolean }> {
    const config = this.providers.get(providerName)
    if (!config) {
      return {
        valid: false,
        error: `Provider not registered: ${providerName}`,
        handled: false,
      }
    }

    const { provider, secret } = config

    // Verify webhook
    const result = await provider.verify(body, headers, secret)
    if (!result.valid) {
      return { ...result, handled: false }
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

    // Call handlers
    let handled = false

    // Call event-specific handlers
    const providerHandlers = this.handlers.get(providerName)
    if (providerHandlers) {
      const eventHandlers = providerHandlers.get(event.type)
      if (eventHandlers) {
        for (const handler of eventHandlers) {
          await handler(event)
          handled = true
        }
      }
    }

    // Call global handlers
    const globalHandlers = this.globalHandlers.get(providerName)
    if (globalHandlers) {
      for (const handler of globalHandlers) {
        await handler(event)
        handled = true
      }
    }

    return { ...result, handled }
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
