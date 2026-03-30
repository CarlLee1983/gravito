import type { RequestScopeManager } from './Container/RequestScopeManager'
import { AsyncLocalStorage } from './compat/async-local-storage'
import { CircularDependencyException } from './exceptions/CircularDependencyException'

/**
 * Factory type for creating service instances
 */
export type Factory<T> = (container: Container) => T

/**
 * AsyncLocalStorage 實例，用於隔離請求範圍
 * @internal
 */
const scopeStorage = new AsyncLocalStorage<RequestScopeManager>()

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
// biome-ignore lint/suspicious/noEmptyInterface: empty interface needed for module augmentation
export interface ServiceMap {}

/**
 * ServiceKey represents the allowed keys for service resolution.
 * Includes keys from ServiceMap, generic strings, or symbols.
 */
export type ServiceKey = keyof ServiceMap | (string & {}) | symbol

interface Binding<T = unknown> {
  factory: Factory<T>
  shared: boolean // true for singleton
  scope?: 'transient' | 'singleton' | 'request' // scope type
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
   * Run a function within a request scope context.
   *
   * All service resolutions within the function will use the provided scope,
   * enabling request-scoped service instances to be properly isolated.
   *
   * @template T - The return type of the function.
   * @param scope - The RequestScopeManager for this request.
   * @param fn - The function to execute within the scope.
   * @returns The result of the function.
   *
   * @example
   * ```typescript
   * const scope = new RequestScopeManager()
   * const result = await Container.runWithScope(scope, async () => {
   *   const service = container.make('requestScoped')
   *   return service.doSomething()
   * })
   * ```
   */
  static runWithScope<T>(scope: RequestScopeManager, fn: () => T | Promise<T>): T | Promise<T> {
    return scopeStorage.run(scope, fn)
  }

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
    this.bindings.set(key, {
      factory: factory as Factory<unknown>,
      shared: false,
      scope: 'transient',
    })
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
    this.bindings.set(key, {
      factory: factory as Factory<unknown>,
      shared: true,
      scope: 'singleton',
    })
  }

  /**
   * Bind a request-scoped service to the container.
   *
   * A new instance will be created for each request and cached within that request.
   * The service is automatically cleaned up when the request ends.
   *
   * @template T - The type of the service being bound.
   * @param key - The unique identifier for the service.
   * @param factory - The factory function that creates the service instance.
   *
   * @example
   * ```typescript
   * container.scoped('requestCache', (c) => new RequestProductCache());
   * ```
   */
  scoped<T>(key: ServiceKey, factory: Factory<T>): void {
    this.bindings.set(key, {
      factory: factory as Factory<unknown>,
      shared: false,
      scope: 'request',
    })
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
   * Check if a service is request-scoped.
   *
   * @param key - The service key to check.
   * @returns True if the service is request-scoped.
   */
  isRequestScoped(key: ServiceKey): boolean {
    return this.bindings.get(key)?.scope === 'request'
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

    // 4. Handle request-scoped services
    if (binding.scope === 'request') {
      const scope = scopeStorage.getStore()
      if (scope) {
        // Use request scope manager to resolve
        return scope.resolve(key, () => binding.factory(this)) as T
      }
      // Fallback: if no scope context, create temporary instance with warning
      console.warn(
        `Request-scoped service '${String(key)}' resolved outside request context. ` +
          'This instance will not be shared across the request. Consider wrapping with Container.runWithScope().'
      )
    }

    // 5. Resolve instance
    this.resolutionStack.push(key)

    try {
      const instance = binding.factory(this)

      // 6. Cache if shared
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
