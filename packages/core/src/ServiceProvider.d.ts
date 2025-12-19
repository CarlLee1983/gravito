import type { Container } from './Container'
import type { PlanetCore } from './PlanetCore'
export declare abstract class ServiceProvider {
  /**
   * Register bindings in the container.
   * This method is called during the registration phase.
   * Do not use 'make' here if relying on other providers.
   */
  abstract register(container: Container): void
  /**
   * Bootstrap any application services.
   * This method is called after all providers have registered.
   * You can safely use 'make' to resolve services here.
   */
  boot?(core: PlanetCore): void | Promise<void>
}
//# sourceMappingURL=ServiceProvider.d.ts.map
