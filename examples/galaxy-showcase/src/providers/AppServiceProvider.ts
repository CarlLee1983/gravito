import { CircuitBreaker } from '@gravito/resilience'
import { CacheManager, MemoryCacheProvider } from '@gravito/stasis'

// Simulated service provider for the Galaxy Showcase
export class AppServiceProvider {
  private cacheManager: CacheManager | undefined
  private circuitBreaker: CircuitBreaker | undefined

  async register(): Promise<void> {
    // Initialize cache service
    const cacheProvider = new MemoryCacheProvider()
    this.cacheManager = new CacheManager(
      () => ({
        get: (key: string) => cacheProvider.get(key),
        put: (key: string, value: unknown) => cacheProvider.set(key, value),
        add: async (key: string, value: unknown) => {
          const existing = await cacheProvider.get(key)
          return existing === null ? (await cacheProvider.set(key, value), true) : false
        },
        forget: async (key: string) => {
          await cacheProvider.delete(key)
          return true
        },
        flush: () => cacheProvider.clear(),
        increment: async () => 1,
        decrement: async () => 0,
      }),
      { default: 'memory', prefix: '', defaultTtl: 60 }
    )

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
    })
  }

  async boot(): Promise<void> {
    // Initialization complete
  }

  async shutdown(): Promise<void> {
    if (this.cacheManager) {
      await this.cacheManager.clear()
    }
  }

  getCache(): CacheManager {
    if (!this.cacheManager) {
      throw new Error('Cache not initialized')
    }
    return this.cacheManager
  }

  getCircuitBreaker(): CircuitBreaker {
    if (!this.circuitBreaker) {
      throw new Error('Circuit breaker not initialized')
    }
    return this.circuitBreaker
  }
}
