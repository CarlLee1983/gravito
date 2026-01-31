import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { createRequestBufferMiddleware } from './middleware'
import { WebhookReceiver } from './receive/WebhookReceiver'
import { WebhookDispatcher } from './send/WebhookDispatcher'
import type { EchoConfig } from './types'

/**
 * OrbitEcho is the official webhook orchestration module for Gravito.
 *
 * It acts as a central hub for managing both incoming webhook reception
 * and outgoing webhook dispatching. It integrates with Gravito's PlanetCore
 * to provide a unified interface for webhook-related operations.
 *
 * @example
 * ```typescript
 * import { PlanetCore } from '@gravito/core';
 * import { OrbitEcho } from '@gravito/echo';
 *
 * const core = new PlanetCore();
 * const echo = new OrbitEcho({
 *   providers: {
 *     stripe: { name: 'stripe', secret: 'whsec_...' }
 *   },
 *   dispatcher: {
 *     secret: 'my_outgoing_secret'
 *   }
 * });
 *
 * core.install(echo);
 * ```
 *
 * @public
 */
export class OrbitEcho implements GravitoOrbit {
  private receiver: WebhookReceiver
  private dispatcher?: WebhookDispatcher
  private echoConfig: EchoConfig

  /**
   * Initializes the Echo module with the provided configuration.
   *
   * Sets up the receiver with registered providers and initializes the
   * dispatcher if configuration is provided. Also configures observability
   * and storage backends.
   *
   * @param config - The configuration for providers, dispatcher, and observability.
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
      if (config.deadLetterQueue) {
        this.dispatcher.setDeadLetterQueue(config.deadLetterQueue)
      }
    }

    // Set storage
    if (config.store) {
      this.receiver.setStore(config.store)
    }

    // Set observability
    if (config.observability) {
      const { metrics, tracer, logger } = config.observability
      if (metrics) {
        this.receiver.setMetrics(metrics)
        this.dispatcher?.setMetrics(metrics)
      }
      if (tracer) {
        this.receiver.setTracer(tracer)
        this.dispatcher?.setTracer(tracer)
      }
      if (logger) {
        this.receiver.setLogger(logger)
      }
    }
  }

  /**
   * Installs the Echo module into the Gravito PlanetCore.
   *
   * Binds the Echo instance and its components (receiver, dispatcher) to the
   * service container and registers a middleware to inject the Echo instance
   * into the request context.
   *
   * @param core - The PlanetCore instance to install into.
   * @throws Error if the core adapter is not initialized.
   */
  install(core: PlanetCore): void {
    // Install request buffer middleware if enabled
    if (this.echoConfig.requestBuffer?.enabled !== false) {
      const bufferMiddleware = createRequestBufferMiddleware(this.echoConfig.requestBuffer)
      core.adapter.use('*', bufferMiddleware)
      core.logger.info('[OrbitEcho] Request buffer middleware installed')
    }

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
   * Returns the webhook receiver instance.
   *
   * Use this to register event handlers or manually handle incoming webhooks.
   *
   * @returns The WebhookReceiver instance.
   */
  getReceiver(): WebhookReceiver {
    return this.receiver
  }

  /**
   * Returns the webhook dispatcher instance, if configured.
   *
   * Use this to send webhooks to external services.
   *
   * @returns The WebhookDispatcher instance or undefined if not configured.
   */
  getDispatcher(): WebhookDispatcher | undefined {
    return this.dispatcher
  }

  /**
   * Returns the current configuration of the Echo module.
   *
   * @returns The EchoConfig object.
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
