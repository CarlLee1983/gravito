import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { CircuitBreaker } from '@gravito/resilience'

export interface ResilienceConfig {
  circuitBreaker?: {
    enabled?: boolean
    threshold?: number
    timeout?: number
  }
}

export class ResilienceOrbit implements GravitoOrbit {
  constructor(private config: ResilienceConfig = {}) {}

  async install(core: PlanetCore): Promise<void> {
    core.logger.info('[Guardian] Resilience Layer is active')

    // Register Circuit Breaker in Container
    core.container.singleton('resilience.circuit-breaker', () => {
      return new CircuitBreaker({
        failureThreshold: this.config.circuitBreaker?.threshold ?? 5,
        resetTimeout: this.config.circuitBreaker?.timeout ?? 10000,
      })
    })
  }
}
