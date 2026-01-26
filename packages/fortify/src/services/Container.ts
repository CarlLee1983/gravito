export interface FortifyServices {
  events: any
  rateLimiter?: any
  strengthValidator?: any
  authLogger?: any
  [key: string]: any
}

type ServiceFactory<T> = () => T

export class FortifyContainer {
  private services = new Map<string, any>()
  private factories = new Map<string, ServiceFactory<any>>()
  private singletons = new Set<string>()

  register<T = any>(key: string, factory: ServiceFactory<T>, singleton = true): this {
    this.factories.set(key, factory)
    if (singleton) {
      this.singletons.add(key)
    }
    return this
  }

  get<T = any>(key: string): T | undefined {
    if (this.singletons.has(key)) {
      if (!this.services.has(key)) {
        const factory = this.factories.get(key)
        if (factory) {
          this.services.set(key, factory())
        }
      }
      return this.services.get(key)
    }

    const factory = this.factories.get(key)
    return factory ? factory() : undefined
  }

  has(key: string): boolean {
    return this.factories.has(key)
  }

  set<T = any>(key: string, value: T): this {
    this.services.set(key, value)
    this.singletons.add(key)
    return this
  }

  clear(): void {
    this.services.clear()
    this.factories.clear()
    this.singletons.clear()
  }
}
