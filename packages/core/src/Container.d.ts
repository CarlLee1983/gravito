/**
 * Factory type for creating service instances
 */
export type Factory<T> = (container: Container) => T
export declare class Container {
  private bindings
  private instances
  /**
   * Bind a service to the container.
   * New instance will be created on each resolution.
   */
  bind<T>(key: string, factory: Factory<T>): void
  /**
   * Bind a shared service to the container (Singleton).
   * Same instance will be returned on each resolution.
   */
  singleton<T>(key: string, factory: Factory<T>): void
  /**
   * Register an existing instance as shared service.
   */
  instance<T>(key: string, instance: T): void
  /**
   * Resolve a service from the container.
   */
  make<T>(key: string): T
  /**
   * Check if a service is bound.
   */
  has(key: string): boolean
  /**
   * Flush all instances and bindings.
   */
  flush(): void
  /**
   * Forget a specific instance (but keep binding)
   */
  forget(key: string): void
}
//# sourceMappingURL=Container.d.ts.map
