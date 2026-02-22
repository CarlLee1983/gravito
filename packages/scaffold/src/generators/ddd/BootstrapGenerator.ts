import type { DirectoryNode } from '../../types'
import { ConfigGenerator } from '../../utils/ConfigGenerator'
import type { GeneratorContext } from '../BaseGenerator'

export class BootstrapGenerator {
  private context: GeneratorContext | null = null

  generate(context: GeneratorContext): DirectoryNode {
    this.context = context
    return {
      type: 'directory',
      name: 'Bootstrap',
      children: [
        { type: 'file', name: 'app.ts', content: this.generateBootstrapApp(context) },
        { type: 'file', name: 'providers.ts', content: this.generateProvidersRegistry(context) },
        { type: 'file', name: 'events.ts', content: this.generateEventsRegistry() },
        { type: 'file', name: 'routes.ts', content: this.generateRoutesRegistry(context) },
      ],
    }
  }

  generateConfigDirectory(context: GeneratorContext): DirectoryNode {
    this.context = context
    return {
      type: 'directory',
      name: 'config',
      children: [
        { type: 'file', name: 'app.ts', content: this.generateAppConfig(context) },
        { type: 'file', name: 'database.ts', content: this.generateDatabaseConfig() },
        { type: 'file', name: 'modules.ts', content: this.generateModulesConfig() },
        { type: 'file', name: 'cache.ts', content: this.generateCacheConfig() },
        { type: 'file', name: 'logging.ts', content: this.generateLoggingConfig() },
      ],
    }
  }

  generateMainEntry(_context: GeneratorContext): string {
    return `/**
 * Application Entry Point
 *
 * Start the HTTP server.
 */

import { createApp } from './Bootstrap/app'

const app = await createApp()

export default app.liftoff()
`
  }

  private generateBootstrapApp(_context: GeneratorContext): string {
    return `/**
 * Application Bootstrap
 *
 * Central configuration and initialization using the ServiceProvider pattern.
 *
 * Lifecycle:
 * 1. Configure: Load app config and orbits
 * 2. Boot: Initialize PlanetCore
 * 3. Register Providers: Bind services to container
 * 4. Bootstrap: Boot all providers
 */

import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitAtlas } from '@gravito/atlas'
import appConfig from '../../config/app'
import { registerProviders } from './providers'
import { registerRoutes } from './routes'

export async function createApp(): Promise<PlanetCore> {
  // 1. Configure
  const config = defineConfig({
    config: appConfig,
    orbits: [
      new OrbitAtlas() as unknown as import('@gravito/core').GravitoOrbit,
    ],
  })

  // 2. Boot Core
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // 3. Register Providers
  await registerProviders(core)

  // 4. Bootstrap All Providers
  await core.bootstrap()

  // Register routes after bootstrap
  registerRoutes(core.router)

  return core
}
`
  }

  private generateProvidersRegistry(_context: GeneratorContext): string {
    return `/**
 * Service Providers Registry
 *
 * Register all service providers here.
 * Include both global and module-specific providers.
 */

import {
  ServiceProvider,
  type Container,
  type PlanetCore,
  bodySizeLimit,
  securityHeaders,
} from '@gravito/core'
import { OrderingServiceProvider } from '../Modules/Ordering/Infrastructure/Providers/OrderingServiceProvider'
import { CatalogServiceProvider } from '../Modules/Catalog/Infrastructure/Providers/CatalogServiceProvider'

/**
 * Middleware Provider - Global middleware registration
 */
export class MiddlewareProvider extends ServiceProvider {
  register(_container: Container): void {}

  boot(core: PlanetCore): void {
    const isDev = process.env.NODE_ENV !== 'production'

    core.adapter.use('*', securityHeaders({
      contentSecurityPolicy: isDev ? false : undefined,
    }))

    core.adapter.use('*', bodySizeLimit(10 * 1024 * 1024))

    core.logger.info('🛡️ Global middleware registered')
  }
}

export async function registerProviders(core: PlanetCore): Promise<void> {
  // Global Providers
  core.register(new MiddlewareProvider())

  // Module Providers
  core.register(new OrderingServiceProvider())
  core.register(new CatalogServiceProvider())

  // Add more providers as needed
}
`
  }

  private generateEventsRegistry(): string {
    return `/**
 * Domain Events Registry
 *
 * Register all domain event handlers here.
 */

import { EventDispatcher } from '../Shared/Infrastructure/EventBus/EventDispatcher'

export function registerEvents(dispatcher: EventDispatcher): void {
    // Register event handlers
    // dispatcher.subscribe('ordering.created', async (event) => { ... })
}
`
  }

  private generateRoutesRegistry(_context: GeneratorContext): string {
    return `/**
 * Routes Registry
 *
 * Register all module routes here.
 */

export function registerRoutes(router: any): void {
    // Health check
    router.get('/health', (c: any) => c.json({ status: 'healthy' }))

    // Ordering module
    router.get('/api/orders', (c: any) => c.json({ message: 'Order list' }))
    router.post('/api/orders', (c: any) => c.json({ message: 'Order created' }, 201))

    // Catalog module
    router.get('/api/products', (c: any) => c.json({ message: 'Product list' }))
}
`
  }

  private generateModulesConfig(): string {
    return `/**
 * Modules Configuration
 *
 * Define module boundaries and their dependencies.
 */

export default {
    modules: {
        ordering: {
            name: 'Ordering',
            description: 'Order management module',
            prefix: '/api/orders',
        },
        catalog: {
            name: 'Catalog',
            description: 'Product catalog module',
            prefix: '/api/products',
        },
    },

    // Module dependencies
    dependencies: {
        ordering: ['catalog'], // Ordering depends on Catalog
    },
}
`
  }

  private generateAppConfig(context: GeneratorContext): string {
    return `export default {
  name: process.env.APP_NAME ?? '${context.name}',
  env: process.env.APP_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  VIEW_DIR: process.env.VIEW_DIR ?? 'src/views',
  debug: process.env.APP_DEBUG === 'true',
  url: process.env.APP_URL ?? 'http://localhost:3000',
}
`
  }

  private generateDatabaseConfig(): string {
    const driver = (this.context?.profileConfig as any)?.drivers?.database ?? 'none'
    return ConfigGenerator.generateDatabaseConfig(driver)
  }

  private generateCacheConfig(): string {
    return `export default {
  default: process.env.CACHE_DRIVER ?? 'memory',
  stores: { memory: { driver: 'memory' } },
}
`
  }

  private generateLoggingConfig(): string {
    return `export default {
  default: 'console',
  channels: { console: { driver: 'console', level: 'debug' } },
}
`
  }
}
