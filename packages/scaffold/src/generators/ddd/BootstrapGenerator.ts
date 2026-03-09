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
        { type: 'file', name: 'auto-di.ts', content: this.generateAutoDiBootstrap() },
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
 * 3. Auto-discover and register services via AutoDiBootstrap
 * 4. Bootstrap: Boot all providers
 * 5. Register routes: Auto-register module routes
 */

import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitAtlas } from '@gravito/atlas'
import appConfig from '../../config/app'
import { AutoDiBootstrap } from '../../Bootstrap/auto-di'
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

  // 3. Auto-discover and register services (OPTIONAL)
  // 取消下列註解以啟用自動 DI 掃描
  // 優點：無需手動修改 registerProviders()
  // 缺點：掃描需要時間（~100ms）
  // await AutoDiBootstrap.scanAndRegisterServices(core.container)

  // 3b. 或使用傳統的顯式提供者註冊（推薦用於生產）
  await registerProviders(core)

  // 4. Bootstrap All Providers
  await core.bootstrap()

  // 5. Auto-register module routes (OPTIONAL)
  // await AutoDiBootstrap.scanAndRegisterRoutes(core)

  // 5b. 或使用傳統的路由註冊
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

  private generateAutoDiBootstrap(): string {
    return `/**
 * AutoDiBootstrap - 自動依賴注入引導層
 *
 * 功能：
 * 1. 自動掃描模組目錄發現服務
 * 2. 自動註冊到 DI 容器
 * 3. 自動註冊路由
 *
 * 使用方式：
 * 在 app.ts 中取消下列註解：
 * await AutoDiBootstrap.scanAndRegisterServices(core.container)
 * await AutoDiBootstrap.scanAndRegisterRoutes(core)
 *
 * 注意：自動掃描會增加啟動時間（~100ms）
 * 生產環境建議使用手動註冊（registerProviders）
 */

import type { Container, PlanetCore } from '@gravito/core'
import { glob } from 'bun'

interface DiscoveredService {
  type: 'domain-service' | 'application-service' | 'repository' | 'event-subscriber'
  filePath: string
  moduleName: string
  className: string
}

interface DiscoveredRoute {
  moduleName: string
  routeFilePath: string
  functionName: string
}

export class AutoDiBootstrap {
  /**
   * 掃描並自動註冊所有模組服務
   */
  static async scanAndRegisterServices(
    container: Container,
    projectRoot = process.cwd(),
  ): Promise<void> {
    const services = await this.discoverServices(projectRoot)
    console.log(\`🔍 發現 \${services.length} 個服務\`)

    for (const service of services) {
      await this.registerService(container, service)
    }

    console.log(\`✅ 已註冊 \${services.length} 個服務到 DI 容器\`)
  }

  /**
   * 掃描並自動註冊所有模組路由
   */
  static async scanAndRegisterRoutes(core: PlanetCore, projectRoot = process.cwd()): Promise<void> {
    const routes = await this.discoverRoutes(projectRoot)
    console.log(\`🛣️  發現 \${routes.length} 個路由模組\`)

    for (const route of routes) {
      try {
        const moduleUrl = new URL(\`file://\${route.routeFilePath}\`)
        const routeModule = await import(moduleUrl.href)
        const registerFunction = routeModule[route.functionName] || routeModule.default

        if (typeof registerFunction === 'function') {
          registerFunction(core)
          console.log(\`  ✓ \${route.moduleName} 路由已註冊\`)
        }
      } catch (error) {
        console.error(\`  ✗ 無法載入 \${route.routeFilePath}:\`, error)
      }
    }

    console.log(\`✅ 已註冊 \${routes.length} 個路由\`)
  }

  private static async discoverServices(projectRoot: string): Promise<DiscoveredService[]> {
    const services: DiscoveredService[] = []

    // 掃描所有 Service 和 Repository
    const patterns = [
      'src/Modules/*/Domain/Services/*Service.ts',
      'src/Modules/*/Application/Services/*Service.ts',
      'src/Modules/*/Infrastructure/Repositories/*Repository.ts',
      'src/Modules/*/Infrastructure/Subscribers/*Subscriber.ts',
    ]

    for (const pattern of patterns) {
      const files = await glob({ cwd: projectRoot, pattern })
      for (const filePath of files) {
        const moduleName = this.extractModuleName(filePath)
        const className = this.extractClassName(filePath)
        const type = this.inferServiceType(filePath) as DiscoveredService['type']

        services.push({ type, filePath, moduleName, className })
      }
    }

    return services
  }

  private static async discoverRoutes(projectRoot: string): Promise<DiscoveredRoute[]> {
    const routeFiles = await glob({
      cwd: projectRoot,
      pattern: 'src/Modules/*/Presentation/Routes/*.routes.ts',
    })

    return routeFiles.map((filePath) => {
      const moduleName = this.extractModuleName(filePath)
      return {
        moduleName,
        routeFilePath: \`\${projectRoot}/\${filePath}\`,
        functionName: \`register\${moduleName}Routes\`,
      }
    })
  }

  private static async registerService(container: Container, service: DiscoveredService): Promise<void> {
    try {
      const moduleUrl = new URL(\`file://\${process.cwd()}/\${service.filePath}\`)
      const module = await import(moduleUrl.href)
      const ServiceClass = module[service.className] || module.default

      if (!ServiceClass) {
        console.warn(\`  ⚠️  無法找到 \${service.className} 在 \${service.filePath}\`)
        return
      }

      const serviceKey = this.generateServiceKey(service.className)
      container.singleton(serviceKey, () => new ServiceClass())

      console.log(\`  ✓ \${serviceKey}\`)
    } catch (error) {
      console.error(\`  ✗ 無法載入 \${service.filePath}:\`, error)
    }
  }

  private static extractModuleName(filePath: string): string {
    const match = filePath.match(/Modules\\/([^\\/]+)/)
    return match ? match[1] : 'Unknown'
  }

  private static extractClassName(filePath: string): string {
    const fileName = filePath.split('/').pop() || ''
    return fileName.replace('.ts', '')
  }

  private static inferServiceType(filePath: string): string {
    if (filePath.includes('/Domain/Services/')) return 'domain-service'
    if (filePath.includes('/Application/Services/')) return 'application-service'
    if (filePath.includes('/Infrastructure/Repositories/')) return 'repository'
    if (filePath.includes('/Infrastructure/Subscribers/')) return 'event-subscriber'
    return 'unknown'
  }

  private static generateServiceKey(className: string): string {
    let name = className
    if (name.startsWith('I') && name.length > 1) name = name.slice(1)
    if (name.endsWith('Service')) name = name.slice(0, -7)
    if (name.endsWith('Repository')) name = name.slice(0, -10)
    return this.toKebabCase(name)
  }

  private static toKebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase()
  }
}
`
  }
}
