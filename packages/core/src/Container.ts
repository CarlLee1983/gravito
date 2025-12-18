/**
 * Factory type for creating service instances
 */
export type Factory<T> = (container: Container) => T

interface Binding<T = unknown> {
    factory: Factory<T>
    shared: boolean // true for singleton
}

export class Container {
    private bindings = new Map<string, Binding>()
    private instances = new Map<string, unknown>()

    /**
     * Bind a service to the container.
     * New instance will be created on each resolution.
     */
    bind<T>(key: string, factory: Factory<T>): void {
        this.bindings.set(key, { factory: factory as Factory<unknown>, shared: false })
    }

    /**
     * Bind a shared service to the container (Singleton).
     * Same instance will be returned on each resolution.
     */
    singleton<T>(key: string, factory: Factory<T>): void {
        this.bindings.set(key, { factory: factory as Factory<unknown>, shared: true })
    }

    /**
     * Register an existing instance as shared service.
     */
    instance<T>(key: string, instance: T): void {
        this.instances.set(key, instance)
    }

    /**
     * Resolve a service from the container.
     */
    make<T>(key: string): T {
        // 1. Check shared instances
        if (this.instances.has(key)) {
            return this.instances.get(key) as T
        }

        // 2. Check bindings
        const binding = this.bindings.get(key)
        if (!binding) {
            throw new Error(`Service '${key}' not found in container`)
        }

        // 3. Create instance
        const instance = binding.factory(this)

        // 4. Cache if shared
        if (binding.shared) {
            this.instances.set(key, instance)
        }

        return instance as T
    }

    /**
     * Check if a service is bound.
     */
    has(key: string): boolean {
        return this.bindings.has(key) || this.instances.has(key)
    }

    /**
     * Flush all instances and bindings.
     */
    flush(): void {
        this.bindings.clear()
        this.instances.clear()
    }

    /**
     * Forget a specific instance (but keep binding)
     */
    forget(key: string): void {
        this.instances.delete(key)
    }
}
