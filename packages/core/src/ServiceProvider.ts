import type { ConfigManager } from './ConfigManager'
import type { Container } from './Container'
import type { PlanetCore } from './PlanetCore'

/**
 * ServiceProvider - The foundation for modular service registration.
 *
 * Service providers are the central place to configure your application.
 * They bind services to the container and bootstrap application features.
 *
 * Lifecycle:
 * 1. register() - Called during registration phase (sync or async)
 * 2. boot() - Called after ALL providers have registered
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * class DatabaseServiceProvider extends ServiceProvider {
 *   register(container: Container) {
 *     container.singleton('db', () => new DatabaseManager());
 *   }
 *
 *   boot(core: PlanetCore) {
 *     const db = core.container.make<DatabaseManager>('db');
 *     db.setDefaultConnection(core.config.get('database.default'));
 *   }
 * }
 * ```
 */
export abstract class ServiceProvider {
  /**
   * Reference to the application core instance.
   * Set during provider registration.
   */
  protected core?: PlanetCore

  /**
   * Whether this provider should be deferred.
   * Deferred providers are only registered when one of their
   * provided services is actually requested from the container.
   */
  public deferred = false

  /**
   * Get the services provided by this provider.
   * Used for deferred loading - provider is only loaded when
   * one of these services is requested.
   *
   * @returns Array of service keys this provider offers
   *
   * @example
   * ```typescript
   * provides(): string[] {
   *   return ['db', 'db.connection'];
   * }
   * ```
   */
  provides(): string[] {
    return []
  }

  /**
   * Register bindings in the container.
   *
   * This method is called during the registration phase.
   * **Warning**: Do not resolve services from other providers here,
   * as they may not be registered yet.
   *
   * Supports both synchronous and asynchronous registration.
   *
   * @param container - The IoC container instance
   */
  abstract register(container: Container): void | Promise<void>

  /**
   * Bootstrap any application services.
   *
   * This method is called after ALL providers have registered.
   * You can safely resolve services from the container here.
   *
   * @param core - The PlanetCore application instance
   */
  boot?(core: PlanetCore): void | Promise<void>

  /**
   * Called when the application is ready to accept requests.
   *
   * This method is called after ALL providers have booted.
   * Use this for final initialization before the server starts accepting traffic.
   *
   * @param core - The PlanetCore application instance
   * @since 2.2.0
   */
  onReady?(core: PlanetCore): void | Promise<void>

  /**
   * Called when the application is shutting down.
   *
   * This method is called during graceful shutdown.
   * Use this to clean up resources, close connections, etc.
   *
   * Providers are called in reverse order (LIFO).
   *
   * @param core - The PlanetCore application instance
   * @since 2.2.0
   */
  onShutdown?(core: PlanetCore): void | Promise<void>

  /**
   * Set the core instance reference.
   * Called internally by the application during registration.
   *
   * @internal
   */
  setCore(core: PlanetCore): void {
    this.core = core
  }

  // ─────────────────────────────────────────────────────────────
  // Configuration Helpers
  // ─────────────────────────────────────────────────────────────

  /**
   * Merge configuration from a value into the application config.
   *
   * If the configuration key already exists and both the existing value and
   * the new value are objects, they will be shallow-merged. Otherwise, the
   * new value will overwrite the existing one.
   *
   * @param config - The ConfigManager instance.
   * @param key - The configuration key to set (supports dot notation).
   * @param value - The configuration value or object to merge.
   *
   * @example
   * ```typescript
   * this.mergeConfig(config, 'database', {
   *   default: 'mysql',
   *   connections: { ... }
   * });
   * ```
   */
  protected mergeConfig(config: ConfigManager, key: string, value: unknown): void {
    const existing = config.has(key) ? config.get(key) : {}

    if (
      typeof existing === 'object' &&
      existing !== null &&
      typeof value === 'object' &&
      value !== null
    ) {
      // Deep merge for objects
      config.set(key, { ...existing, ...value })
    } else {
      config.set(key, value)
    }
  }

  /**
   * Merge configuration from an async loader.
   * Useful for loading config from .ts files dynamically.
   *
   * @param config - The ConfigManager instance
   * @param key - The configuration key
   * @param loader - Async function that returns config value
   *
   * @example
   * ```typescript
   * await this.mergeConfigFrom(config, 'database', async () => {
   *   return (await import('./config/database')).default;
   * });
   * ```
   */
  protected async mergeConfigFrom(
    config: ConfigManager,
    key: string,
    loader: () => Promise<unknown>
  ): Promise<void> {
    const value = await loader()
    this.mergeConfig(config, key, value)
  }

  // ─────────────────────────────────────────────────────────────
  // Publishing (for CLI support)
  // ─────────────────────────────────────────────────────────────

  /**
   * Paths that should be published by the CLI.
   * Maps source paths to destination paths.
   */
  private static publishables: Map<string, Map<string, string>> = new Map()

  /**
   * Register paths to be published by the CLI.
   *
   * Used by CLI commands like `gravito vendor:publish` to copy configuration,
   * views, or assets from the package to the application directory.
   *
   * @param paths - A record mapping source paths to destination paths.
   * @param group - Optional group name for selective publishing (e.g., 'config', 'views').
   *
   * @example
   * ```typescript
   * this.publishes({
   *   './config/cache.ts': 'config/cache.ts',
   *   './views/errors': 'resources/views/errors'
   * }, 'config');
   * ```
   */
  protected publishes(paths: Record<string, string>, group?: string): void {
    const groupKey = group ?? this.constructor.name

    if (!ServiceProvider.publishables.has(groupKey)) {
      ServiceProvider.publishables.set(groupKey, new Map())
    }

    const groupPaths = ServiceProvider.publishables.get(groupKey)!
    for (const [source, dest] of Object.entries(paths)) {
      groupPaths.set(source, dest)
    }
  }

  /**
   * Get all publishable paths for a group.
   *
   * @param group - The group name (defaults to provider class name)
   * @returns Map of source to destination paths
   */
  static getPublishables(group?: string): Map<string, string> {
    if (group) {
      return ServiceProvider.publishables.get(group) ?? new Map()
    }

    // Return all publishables merged
    const all = new Map<string, string>()
    for (const paths of ServiceProvider.publishables.values()) {
      for (const [source, dest] of paths) {
        all.set(source, dest)
      }
    }
    return all
  }

  /**
   * Get all publish groups.
   *
   * @returns Array of group names
   */
  static getPublishGroups(): string[] {
    return Array.from(ServiceProvider.publishables.keys())
  }
}
