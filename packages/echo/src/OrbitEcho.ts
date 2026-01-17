import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { WebhookReceiver } from './receive/WebhookReceiver'
import { WebhookDispatcher } from './send/WebhookDispatcher'
import type { EchoConfig } from './types'

/**
 * OrbitEcho is the official webhook orchestration module for Gravito.
 *
 * It provides a secure way to receive incoming webhooks (e.g., from Stripe, GitHub)
 * and a reliable way to dispatch outgoing webhooks to third-party services.
 *
 * @example
 * ```typescript
 * const echo = new OrbitEcho({
 *   providers: {
 *     stripe: { name: 'stripe', secret: 'whsec_...' }
 *   }
 * });
 * core.addOrbit(echo);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class OrbitEcho implements GravitoOrbit {
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
    // Bind instances to container
    core.container.instance('echo', this)
    core.container.instance('echo.receiver', this.receiver)
    if (this.dispatcher) {
      core.container.instance('echo.dispatcher', this.dispatcher)
    }

    // Inject into context via middleware
    core.adapter.use('*', async (c, next) => {
      c.set('echo', this)
      return await next()
    })

    core.logger.info('[OrbitEcho] Webhook receiver and dispatcher registered')
  }

  /**
   * Get webhook receiver
   */
  getReceiver(): WebhookReceiver {
    return this.receiver
  }

  /**
   * Get webhook dispatcher
   */
  getDispatcher(): WebhookDispatcher | undefined {
    return this.dispatcher
  }

  /**
   * Get configuration
   */
  getConfig(): EchoConfig {
    return this.echoConfig
  }
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Webhook receiver and dispatcher */
    echo?: OrbitEcho
  }
}
