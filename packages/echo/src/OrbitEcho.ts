import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { EchoError } from './errors/EchoError'
import { EchoErrorCodes } from './errors/codes'
import { createRequestBufferMiddleware } from './middleware'
import { WebhookReceiver } from './receive/WebhookReceiver'
import { KeyRotationManager } from './rotation/KeyRotationManager'
import { WebhookDispatcher } from './send/WebhookDispatcher'
import type { EchoConfig, ProviderKeyEntry, WebhookProviderConfigWithRotation } from './types'

/**
 * OrbitEcho is the official webhook orchestration module for the Gravito ecosystem.
 *
 * It serves as a comprehensive hub for managing the entire webhook lifecycle,
 * including secure reception, signature verification across multiple providers,
 * persistent storage for auditing, and reliable outgoing dispatch with
 * exponential backoff and circuit breaking.
 *
 * @example Basic integration with PlanetCore
 * ```typescript
 * import { PlanetCore } from '@gravito/core';
 * import { OrbitEcho } from '@gravito/echo';
 *
 * const core = new PlanetCore();
 * const echo = new OrbitEcho({
 *   providers: {
 *     stripe: { name: 'stripe', secret: process.env.STRIPE_SECRET }
 *   },
 *   dispatcher: {
 *     secret: process.env.APP_WEBHOOK_SECRET
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
  private keyRotationManager?: KeyRotationManager

  /**
   * Constructs a new OrbitEcho instance with the specified configuration.
   *
   * This constructor initializes the core receiver component, sets up key rotation
   * orchestration if enabled, registers defined providers, and connects the
   * observability stack (metrics, tracing, logging).
   *
   * @param config - The global configuration defining providers, dispatchers, and infrastructure.
   */
  constructor(config: EchoConfig = {}) {
    this.echoConfig = config
    this.receiver = new WebhookReceiver()

    // Initialize key rotation if enabled
    if (config.keyRotation?.enabled) {
      this.keyRotationManager = new KeyRotationManager(config.keyRotation)
      this.receiver.setKeyRotationManager(this.keyRotationManager)
    }

    // Register providers
    if (config.providers) {
      for (const [name, providerConfig] of Object.entries(config.providers)) {
        const rotationConfig = providerConfig as WebhookProviderConfigWithRotation

        // Check if provider has key rotation configured
        if (rotationConfig.keys && rotationConfig.keys.length > 0 && this.keyRotationManager) {
          this.receiver.registerProviderWithRotation(name, rotationConfig.keys, {
            type: providerConfig.name,
            tolerance: providerConfig.tolerance,
          })
        } else {
          // Fallback to single key registration
          this.receiver.registerProvider(name, providerConfig.secret, {
            type: providerConfig.name,
            tolerance: providerConfig.tolerance,
          })
        }
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
   * Integrates the Echo module into the Gravito application lifecycle.
   *
   * This method performs the following setup tasks:
   * 1. Installs request buffering middleware (if enabled) to preserve raw bodies.
   * 2. Binds Echo components to the service container (`echo`, `echo.receiver`).
   * 3. Injects the Echo instance into the request context for easy access in handlers.
   *
   * @param core - The PlanetCore instance managing the application.
   * @throws {Error} If the core adapter is missing or improperly configured.
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
   * Retrieves the underlying receiver instance for manual webhook processing.
   *
   * Use this when you need fine-grained control over how incoming webhooks
   * are routed or verified outside of the standard middleware flow.
   *
   * @returns The active WebhookReceiver instance.
   */
  getReceiver(): WebhookReceiver {
    return this.receiver
  }

  /**
   * Retrieves the dispatcher instance for sending outgoing webhooks.
   *
   * @returns The configured WebhookDispatcher, or undefined if dispatch is disabled.
   */
  getDispatcher(): WebhookDispatcher | undefined {
    return this.dispatcher
  }

  /**
   * Accesses the active configuration used by this OrbitEcho instance.
   *
   * @returns The immutable EchoConfig object.
   */
  getConfig(): EchoConfig {
    return this.echoConfig
  }

  /**
   * Retrieves the key rotation manager responsible for secret lifecycle.
   *
   * @returns The manager instance, or undefined if key rotation is disabled.
   */
  getKeyRotationManager(): KeyRotationManager | undefined {
    return this.keyRotationManager
  }

  /**
   * Initiates a zero-downtime primary key rotation for a specific provider.
   *
   * This method promotes a new key to primary status while maintaining valid old keys
   * for a grace period, ensuring that webhooks signed with either key are accepted
   * during the transition.
   *
   * @param providerName - The identifier of the provider to update.
   * @param newKey - Metadata and value for the replacement key.
   * @throws {Error} If key rotation is not enabled in the global configuration.
   *
   * @example
   * ```typescript
   * await echo.rotateProviderKey('stripe', {
   *   key: 'whsec_new_secret',
   *   version: 'v2',
   *   activeFrom: new Date()
   * });
   * ```
   */
  async rotateProviderKey(
    providerName: string,
    newKey: Omit<ProviderKeyEntry, 'isPrimary'>
  ): Promise<void> {
    if (!this.keyRotationManager) {
      throw new EchoError(
        EchoErrorCodes.KEY_ROTATION_NOT_ENABLED,
        'Key rotation is not enabled'
      )
    }

    await this.keyRotationManager.rotatePrimaryKey(providerName, newKey)
  }
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Webhook receiver and dispatcher */
    echo?: OrbitEcho
  }
}
