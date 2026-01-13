import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'

export class RouteProvider extends ServiceProvider {
  register(container: Container): void {
    // Routes will be registered in boot
  }

  async boot(core: PlanetCore): Promise<void> {
    // Import and register routes
    const { registerRoutes } = await import('../routes')
    registerRoutes(core.router)
  }
}
