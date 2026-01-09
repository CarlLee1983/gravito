/**
 * @fileoverview Application - Enterprise Application Container
 *
 * A high-level application class that orchestrates the entire framework.
 * Provides a centralized entry point for enterprise applications with
 * auto-discovery of providers, config loading, and lifecycle management.
 *
 * @module @gravito/core
 * @since 2.0.0
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ConfigManager } from './ConfigManager'
import { Container } from './Container'
import type { EventManager } from './EventManager'
import type { Logger } from './Logger'
import { ConsoleLogger } from './Logger'
import { PlanetCore } from './PlanetCore'
import type { ServiceProvider } from './ServiceProvider'

export interface ApplicationConfig {
  /**
   * Base path of the application
   */
  basePath: string

  /**
   * Path to the config directory (relative to basePath)
   * @default 'config'
   */
  configPath?: string

  /**
   * Path to the providers directory (relative to basePath)
   * @default 'src/Providers'
   */
  providersPath?: string

  /**
   * Environment (development, production, testing)
   */
  env?: 'development' | 'production' | 'testing'

  /**
   * Logger instance
   */
  logger?: Logger

  /**
   * Initial configuration values
   */
  config?: Record<string, unknown>

  /**
   * Service providers to register
   */
  providers?: ServiceProvider[]

  /**
   * Whether to auto-discover providers from providersPath
   * @default true
   */
  autoDiscoverProviders?: boolean
}

/**
 * Application - Enterprise-grade application container.
 *
 * Provides a higher-level abstraction over PlanetCore for building
 * enterprise applications with convention-over-configuration patterns.
 *
 * @example
 * ```typescript
 * // Create application
 * const app = new Application({
 *   basePath: import.meta.dir,
 *   env: process.env.NODE_ENV as 'development' | 'production',
 * });
 *
 * // Boot the application
 * await app.boot();
 *
 * // Access core
 * export default app.core.liftoff();
 * ```
 */
export class Application {
  /**
   * The underlying PlanetCore instance.
   */
  public readonly core: PlanetCore

  /**
   * The IoC container.
   */
  public readonly container: Container

  /**
   * The configuration manager.
   */
  public readonly config: ConfigManager

  /**
   * The event manager.
   */
  public readonly events: EventManager

  /**
   * The logger instance.
   */
  public readonly logger: Logger

  /**
   * Application base path.
   */
  public readonly basePath: string

  /**
   * Environment mode.
   */
  public readonly env: 'development' | 'production' | 'testing'

  /**
   * Configuration options.
   */
  private readonly options: ApplicationConfig

  /**
   * Whether the application has been booted.
   */
  private booted = false

  constructor(options: ApplicationConfig) {
    this.options = options
    this.basePath = options.basePath
    this.env =
      options.env ??
      (process.env.NODE_ENV as 'development' | 'production' | 'testing') ??
      'development'
    this.logger = options.logger ?? new ConsoleLogger()

    // Initialize container and config
    this.container = new Container()
    this.config = new ConfigManager(options.config ?? {})

    // Initialize core with shared instances
    this.core = new PlanetCore({
      logger: this.logger,
      config: options.config,
    })

    // Share container reference
    // Note: PlanetCore creates its own container, so we need to use that
    // In future, we might want to inject the container into PlanetCore

    this.events = this.core.events

    // Register self in container
    this.container.instance('app', this)
    this.container.instance('config', this.config)
    this.container.instance('logger', this.logger)
    this.container.instance('events', this.events)
  }

  /**
   * Boot the application.
   *
   * This will:
   * 1. Load configuration files
   * 2. Auto-discover providers (if enabled)
   * 3. Register all providers
   * 4. Bootstrap the core
   *
   * @returns Promise that resolves when boot is complete
   */
  async boot(): Promise<this> {
    if (this.booted) {
      return this
    }

    this.logger.info(`🚀 Booting application in ${this.env} mode...`)

    // 1. Load configuration
    await this.loadConfiguration()

    // 2. Auto-discover and register providers
    if (this.options.autoDiscoverProviders !== false) {
      await this.discoverProviders()
    }

    // 3. Register explicit providers
    if (this.options.providers) {
      for (const provider of this.options.providers) {
        this.core.register(provider)
      }
    }

    // 4. Bootstrap core (register + boot all providers)
    await this.core.bootstrap()

    this.booted = true
    this.logger.info('✅ Application booted successfully')

    return this
  }

  /**
   * Load configuration files from the config directory.
   *
   * @internal
   */
  private async loadConfiguration(): Promise<void> {
    const configPath = path.resolve(this.basePath, this.options.configPath ?? 'config')

    try {
      const stat = await fs.stat(configPath)
      if (!stat.isDirectory()) {
        return
      }

      const files = await fs.readdir(configPath)

      for (const file of files) {
        if (!file.endsWith('.ts') && !file.endsWith('.js')) {
          continue
        }

        const key = path.basename(file, path.extname(file))
        const filePath = path.resolve(configPath, file)

        try {
          const module = await import(pathToFileURL(filePath).href)
          const value = module.default ?? module

          this.config.set(key, value)
          this.logger.info(`📋 Loaded config: ${key}`)
        } catch (err) {
          this.logger.warn(`Failed to load config ${file}:`, err)
        }
      }
    } catch {
      // Config directory doesn't exist, that's fine
      this.logger.info('No config directory found, skipping config loading')
    }
  }

  /**
   * Discover and register providers from the providers directory.
   *
   * @internal
   */
  private async discoverProviders(): Promise<void> {
    const providersPath = path.resolve(this.basePath, this.options.providersPath ?? 'src/Providers')

    try {
      const stat = await fs.stat(providersPath)
      if (!stat.isDirectory()) {
        return
      }

      const files = await fs.readdir(providersPath)

      for (const file of files) {
        if (!file.endsWith('Provider.ts') && !file.endsWith('Provider.js')) {
          continue
        }

        const filePath = path.resolve(providersPath, file)

        try {
          const module = await import(pathToFileURL(filePath).href)

          // Look for default export or a class that extends ServiceProvider
          const ProviderClass =
            module.default ??
            Object.values(module).find(
              (exp): exp is new () => ServiceProvider =>
                typeof exp === 'function' && exp.prototype?.register
            )

          if (ProviderClass && typeof ProviderClass === 'function') {
            const provider = new ProviderClass()
            this.core.register(provider)
            this.logger.info(`🔌 Registered provider: ${ProviderClass.name}`)
          }
        } catch (err) {
          this.logger.warn(`Failed to load provider ${file}:`, err)
        }
      }
    } catch {
      // Providers directory doesn't exist, that's fine
    }
  }

  /**
   * Get a service from the container.
   *
   * @param key - The service key
   * @returns The resolved service
   */
  make<T>(key: string): T {
    return this.core.container.make<T>(key)
  }

  /**
   * Check if a service is bound.
   *
   * @param key - The service key
   * @returns True if bound
   */
  has(key: string): boolean {
    return this.core.container.has(key)
  }

  /**
   * Get a configuration value.
   *
   * @param key - The config key (supports dot notation)
   * @param defaultValue - Default value if not found
   * @returns The config value
   */
  getConfig<T>(key: string, defaultValue?: T): T {
    return this.config.get<T>(key, defaultValue)
  }

  /**
   * Create application path helper.
   *
   * @param segments - Path segments relative to base path
   * @returns Absolute path
   */
  path(...segments: string[]): string {
    return path.resolve(this.basePath, ...segments)
  }

  /**
   * Get the config path.
   *
   * @param segments - Additional path segments
   * @returns Absolute path to config directory
   */
  configPath(...segments: string[]): string {
    return this.path(this.options.configPath ?? 'config', ...segments)
  }

  /**
   * Check if running in production.
   */
  isProduction(): boolean {
    return this.env === 'production'
  }

  /**
   * Check if running in development.
   */
  isDevelopment(): boolean {
    return this.env === 'development'
  }

  /**
   * Check if running in testing.
   */
  isTesting(): boolean {
    return this.env === 'testing'
  }
}
