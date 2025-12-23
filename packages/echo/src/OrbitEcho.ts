/**
 * @fileoverview OrbitEcho Module
 *
 * Gravito integration for webhook handling.
 *
 * @module @gravito/echo
 */

import { WebhookReceiver } from './receive/WebhookReceiver'
import { WebhookDispatcher } from './send/WebhookDispatcher'
import type { EchoConfig } from './types'

/**
 * Simple module interface for PlanetCore integration
 */
interface ModuleConfig {
  singleton?: boolean
}

/**
 * Minimal ServiceProvider interface
 */
interface ServiceProvider {
  register?(): void | Promise<void>
  boot?(): void | Promise<void>
}

/**
 * Minimal PlanetCore interface
 */
interface PlanetCore {
  container: {
    bindSingleton<T>(key: string, value: T): void
  }
  hooks: {
    addAction(hook: string, callback: () => void | Promise<void>): void
  }
  adapter: {
    use(middleware: unknown): void
  }
  router: {
    post(path: string, handler: unknown): void
  }
}

/**
 * OrbitEcho - Gravito Webhook Module
 *
 * Provides secure webhook receiving and reliable webhook sending.
 *
 * @example
 * ```typescript
 * const core = new PlanetCore()
 *
 * core.install(new OrbitEcho({
 *   providers: {
 *     stripe: { name: 'stripe', secret: process.env.STRIPE_WEBHOOK_SECRET! },
 *     github: { name: 'github', secret: process.env.GITHUB_WEBHOOK_SECRET! }
 *   },
 *   dispatcher: {
 *     secret: process.env.OUTGOING_WEBHOOK_SECRET!
 *   }
 * }))
 *
 * // Get receiver to add handlers
 * const receiver = core.container.make<WebhookReceiver>('echo.receiver')
 * receiver.on('stripe', 'payment_intent.succeeded', async (event) => {
 *   console.log('Payment received:', event.payload)
 * })
 * ```
 */
export class OrbitEcho {
  static config: ModuleConfig = { singleton: true }

  private receiver: WebhookReceiver
  private dispatcher?: WebhookDispatcher
  private echoConfig: EchoConfig

  /**
   * Create a new OrbitEcho instance.
   *
   * @param config - The configuration object for providers and dispatcher.
   */
  constructor(config: EchoConfig = {}) {
    this.echoConfig = config
    this.receiver = new WebhookReceiver()

    // Register providers
    if (config.providers) {
      for (const [name, providerConfig] of Object.entries(config.providers)) {
        this.receiver.registerProvider(name, providerConfig.secret, {
          type: providerConfig.name,
          tolerance: providerConfig.tolerance,
        })
      }
    }

    // Create dispatcher
    if (config.dispatcher) {
      this.dispatcher = new WebhookDispatcher(config.dispatcher)
    }
  }

  /**
   * Install into PlanetCore
   *
   * Registers the OrbitEcho instance and its components into the service container.
   *
   * @param core - The PlanetCore instance.
   */
  install(core: PlanetCore): void {
    // Bind instances
    core.container.bindSingleton('echo', this)
    core.container.bindSingleton('echo.receiver', this.receiver)
    if (this.dispatcher) {
      core.container.bindSingleton('echo.dispatcher', this.dispatcher)
    }
  }

  /**
   * Get webhook receiver
   *
   * @returns The WebhookReceiver instance.
   */
  getReceiver(): WebhookReceiver {
    return this.receiver
  }

  /**
   * Get webhook dispatcher
   *
   * @returns The WebhookDispatcher instance, or undefined if not configured.
   */
  getDispatcher(): WebhookDispatcher | undefined {
    return this.dispatcher
  }

  /**
   * Get configuration
   *
   * @returns The EchoConfig object.
   */
  getConfig(): EchoConfig {
    return this.echoConfig
  }
}
