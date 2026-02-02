import { CircularDependencyException } from './exceptions/CircularDependencyException'

/**
 * Factory type for creating service instances
 */
export type Factory<T> = (container: Container) => T

// eslint-disable-next-line @typescript-eslint/no-empty-interface
/**
 * ServiceMap interface for type-safe IoC resolution.
 *
 * Extend this interface via module augmentation to get type inference:
 * @example
 * ```typescript
 * declare module '@gravito/core' {
 *   interface ServiceMap {
 *     logger: Logger
 *     db: DatabaseConnection
 *   }
 * }
 * ```
 */
export type ServiceMap = {}

/**
 * ServiceKey represents the allowed keys for service resolution.
 * Includes keys from ServiceMap, generic strings, or symbols.
 */
// biome-ignore lint/complexity/noBannedTypes: needed for string autocomplete hack
export type ServiceKey = keyof ServiceMap | (string & {}) | symbol

interface Binding<T = unknown> {
  factory: Factory<T>
  shared: boolean // true for singleton
}

/**
 * Container - Simple Dependency Injection Container.
 * Manages service bindings and singleton instances.
 * @public
 */
export class Container {
  private bindings = new Map<ServiceKey, Binding>()
  private instances = new Map<ServiceKey, unknown>()
  private resolutionStack: ServiceKey[] = []

  /**
   * Bind a service to the container.
   *
   * A new instance will be created by the factory function every time the
   * service is resolved from the container.
   *
   * @template T - The type of the service being bound.
   * @param key - The unique identifier for the service.
   * @param factory - The factory function that creates the service instance.
   *
   * @example
   * ```typescript
   * container.bind('logger', (c) => new ConsoleLogger());
   * ```
   */
  bind<T>(key: ServiceKey, factory: Factory<T>): void {
    this.bindings.set(key, { factory: factory as Factory<unknown>, shared: false })
  }

  /**
   * Bind a shared service to the container (Singleton).
   *
   * The factory function will be called only once, and the same instance
   * will be returned on every subsequent resolution.
   *
   * @template T - The type of the service being bound.
   * @param key - The unique identifier for the service.
   * @param factory - The factory function that creates the service instance.
   *
   * @example
   * ```typescript
   * container.singleton('db', (c) => new DatabaseConnection());
   * ```
   */
  singleton<T>(key: ServiceKey, factory: Factory<T>): void {
    this.bindings.set(key, { factory: factory as Factory<unknown>, shared: true })
  }

  /**
   * Register an existing instance as a shared service.
   *
   * @param key - The unique identifier for the service.
   * @param instance - The instance to register.
   */
  instance<T>(key: ServiceKey, instance: T): void {
    this.instances.set(key, instance)
  }

  /**
   * Resolve a service instance from the container.
   *
   * Automatically handles singleton caching and factory execution.
   *
   * @template T - The expected type of the service.
   * @param key - The unique identifier for the service.
   * @returns The resolved service instance.
   * @throws Error if the service key is not found in the container.
   *
   * @example
   * ```typescript
   * const logger = container.make<Logger>('logger');
   * ```
   */
  make<K extends keyof ServiceMap>(key: K): ServiceMap[K]
  make<T>(key: ServiceKey): T
  make<T>(key: ServiceKey): T {
    // 1. Check shared instances
    if (this.instances.has(key)) {
      return this.instances.get(key) as T
    }

    // 2. Check for circular dependencies
    if (this.resolutionStack.includes(key)) {
      throw new CircularDependencyException(key, this.resolutionStack)
    }

    // 3. Check bindings
    const binding = this.bindings.get(key)
    if (!binding) {
      throw new Error(`Service '${String(key)}' not found in container`)
    }

    // 4. Resolve instance
    this.resolutionStack.push(key)

    try {
      const instance = binding.factory(this)

      // 5. Cache if shared
      if (binding.shared) {
        this.instances.set(key, instance)
      }

      return instance as T
    } finally {
      this.resolutionStack.pop()
    }
  }

  /**
   * Check if a service is bound or has an instance in the container.
   *
   * @param key - The service key to check.
   * @returns True if the service exists.
   */
  has(key: ServiceKey): boolean {
    return this.bindings.has(key) || this.instances.has(key)
  }

  /**
   * Flush all instances and bindings from the container.
   * Resets the container to an empty state.
   */
  flush(): void {
    this.bindings.clear()
    this.instances.clear()
  }

  /**
   * Forget a specific instance while keeping its binding.
   *
   * @param key - The service key to forget.
   */
  forget(key: ServiceKey): void {
    this.instances.delete(key)
  }
}
