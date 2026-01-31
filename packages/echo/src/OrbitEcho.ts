import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { createRequestBufferMiddleware } from './middleware'
import { WebhookReceiver } from './receive/WebhookReceiver'
import { KeyRotationManager } from './rotation/KeyRotationManager'
import { WebhookDispatcher } from './send/WebhookDispatcher'
import type { EchoConfig, ProviderKeyEntry, WebhookProviderConfigWithRotation } from './types'

/**
 * OrbitEcho is the official webhook orchestration module for Gravito.
 *
 * It serves as a comprehensive hub for managing the entire webhook lifecycle,
 * including secure reception, signature verification, persistent storage,
 * and reliable outgoing dispatch with retry logic.
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
   * Initializes the core receiver component, sets up key rotation if enabled,
   * registers providers, and configures observability and storage backends.
   *
   * @param config - Global configuration for providers, dispatchers, and infrastructure.
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
   * Integrates the Echo module into the Gravito PlanetCore ecosystem.
   *
   * Registers required middleware for request buffering and context injection,
   * and binds Echo components to the service container for global accessibility.
   *
   * @param core - The PlanetCore instance managing the application lifecycle.
   * @throws {Error} If the core adapter is missing or improperly initialized.
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
   * @returns The WebhookReceiver instance.
   */
  getReceiver(): WebhookReceiver {
    return this.receiver
  }

  /**
   * Retrieves the dispatcher instance for sending outgoing webhooks.
   *
   * @returns The dispatcher if configured, otherwise undefined.
   */
  getDispatcher(): WebhookDispatcher | undefined {
    return this.dispatcher
  }

  /**
   * Returns the active configuration used by this Echo instance.
   *
   * @returns The immutable EchoConfig object.
   */
  getConfig(): EchoConfig {
    return this.echoConfig
  }

  /**
   * Retrieves the key rotation manager responsible for secret lifecycle.
   *
   * @returns The manager if enabled, otherwise undefined.
   */
  getKeyRotationManager(): KeyRotationManager | undefined {
    return this.keyRotationManager
  }

  /**
   * Triggers a primary key rotation for a specific webhook provider.
   *
   * Allows for zero-downtime key updates by promoting a new key to primary
   * status while optionally maintaining the old key for a grace period.
   *
   * @param providerName - Canonical name of the provider to update.
   * @param newKey - Metadata and value for the replacement key.
   * @throws {Error} If key rotation is not enabled in the global config.
   *
   * @example
   * ```typescript
   * await echo.rotateProviderKey('stripe', {
   *   key: 'new_secret_...',
   *   version: '2026-01-31',
   *   activeFrom: new Date()
   * });
   * ```
   */
  async rotateProviderKey(
    providerName: string,
    newKey: Omit<ProviderKeyEntry, 'isPrimary'>
  ): Promise<void> {
    if (!this.keyRotationManager) {
      throw new Error('Key rotation is not enabled')
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
