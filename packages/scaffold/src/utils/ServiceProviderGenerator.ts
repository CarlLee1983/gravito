/**
 * ServiceProviderGenerator - Shared service provider generator
 *
 * Provides common service provider generation logic for all generators.
 */

import type { GeneratorContext } from './ConfigGenerator'

export class ServiceProviderGenerator {
  /**
   * Generate App Service Provider
   */
  static generateAppServiceProvider(context: GeneratorContext, architectureName: string): string {
    return `/**
 * App Service Provider
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'

export class AppServiceProvider extends ServiceProvider {
  register(_container: Container): void {
    // Register application services
  }

  boot(_core: PlanetCore): void {
    console.log('${context.name} (${architectureName}) booted!')
  }
}
`
  }

  /**
   * Generate Middleware Provider
   */
  static generateMiddlewareProvider(): string {
    return `/**
 * Middleware Service Provider
 */

import {
  ServiceProvider,
  type Container,
  type PlanetCore,
  bodySizeLimit,
  securityHeaders,
} from '@gravito/core'

export class MiddlewareProvider extends ServiceProvider {
  register(_container: Container): void {}

  boot(core: PlanetCore): void {
    const isDev = process.env.NODE_ENV !== 'production'

    core.adapter.use('*', securityHeaders({
      contentSecurityPolicy: isDev ? false : undefined,
    }))

    core.adapter.use('*', bodySizeLimit(10 * 1024 * 1024))

    core.logger.info('🛡️ Middleware registered')
  }
}
`
  }

  /**
   * Generate Route Provider
   */
  static generateRouteProvider(
    routePath = '../../routes/api',
    importType: 'default' | 'named' = 'default'
  ): string {
    const importStatement =
      importType === 'default'
        ? `import routes from '${routePath}'`
        : `import { registerApiRoutes } from '${routePath}'`
    const routeCall =
      importType === 'default' ? 'routes(core.router)' : 'registerApiRoutes(core.router)'

    return `/**
 * Route Service Provider
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'
${importStatement}

export class RouteProvider extends ServiceProvider {
  register(_container: Container): void {}

  boot(core: PlanetCore): void {
    ${routeCall}
    core.logger.info('🛤️ Routes registered')
  }
}
`
  }

  /**
   * Generate Providers Index
   */
  static generateProvidersIndex(
    providers: string[] = ['AppServiceProvider', 'MiddlewareProvider', 'RouteProvider']
  ): string {
    const exports = providers.map((p) => `export { ${p} } from './${p}'`).join('\n')
    return `/**
 * Application Service Providers
 */

${exports}
`
  }

  /**
   * Generate Repository Service Provider
   */
  static generateRepositoryServiceProvider(
    repositories: string[] = [],
    additionalServices: string[] = []
  ): string {
    const repositoryRegistrations = repositories
      .map((repo) => `    container.singleton('${repo}', () => new ${repo}())`)
      .join('\n')
    const serviceRegistrations = additionalServices
      .map((service) => `    container.singleton('${service}', () => new ${service}())`)
      .join('\n')

    const imports = [
      ...repositories.map(
        (repo) => `import { ${repo} } from '../Persistence/Repositories/${repo}'`
      ),
      ...additionalServices.map(
        (service) => `import { ${service} } from '../ExternalServices/${service}'`
      ),
    ].join('\n')

    return `/**
 * Repository Service Provider
 *
 * Binds repository interfaces to implementations.
 */

import { ServiceProvider, type Container } from '@gravito/core'
${imports}

export class RepositoryServiceProvider extends ServiceProvider {
  register(container: Container): void {
${repositoryRegistrations || '    // Bind repositories here'}
${serviceRegistrations || '    // Bind external services here'}
  }
}
`
  }

  /**
   * Generate Database Provider
   */
  static generateDatabaseProvider(): string {
    return `/**
 * Database Service Provider
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'
import { OrbitAtlas } from '@gravito/atlas'

export class DatabaseProvider extends ServiceProvider {
  register(_container: Container): void {
    // Register database connections
  }

  boot(core: PlanetCore): void {
    // Initialize database
    core.logger.info('🗄️ Database initialized')
  }
}
`
  }
}
