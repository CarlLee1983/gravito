/**
 * ActionDomainGenerator - Action Domain Architecture Generator
 *
 * Generates a structure focused on Single Action Controllers (Action Domain):
 * - Actions: Single responsibility business logic units
 * - Controllers: Thin HTTP layers invoking Actions
 * - Types: Request/Response definitions
 * - Repositories: Data access abstraction
 */

import type { DirectoryNode } from '../types'
import { BaseGenerator, type GeneratorContext } from './BaseGenerator'

/**
 * ActionDomainGenerator implements the Action-Domain architectural pattern.
 *
 * This pattern focuses on single-responsibility "Action" units for business logic,
 * thin controllers for HTTP handling, and clear separation between request/response
 * types and domain models.
 *
 * @public
 * @since 3.0.0
 */
export class ActionDomainGenerator extends BaseGenerator {
  get architectureType() {
    return 'action-domain' as const
  }

  get displayName(): string {
    return 'Action Domain'
  }

  get description(): string {
    return 'Single-responsibility Action pattern for clear business logic separation'
  }

  getDirectoryStructure(context: GeneratorContext): DirectoryNode[] {
    return [
      {
        type: 'directory',
        name: 'config',
        children: [
          { type: 'file', name: 'app.ts', content: this.generateAppConfig(context) },
          { type: 'file', name: 'database.ts', content: this.generateDatabaseConfig() },
        ],
      },
      {
        type: 'directory',
        name: 'database',
        children: [{ type: 'file', name: '.gitkeep', content: '' }],
      },
      {
        type: 'directory',
        name: 'src',
        children: [
          {
            type: 'directory',
            name: 'actions',
            children: [
              { type: 'file', name: 'Action.ts', content: this.generateActionBase() },
              {
                type: 'directory',
                name: 'server',
                children: [
                  {
                    type: 'file',
                    name: 'GetServerStatusAction.ts',
                    content: this.generateGetServerStatusAction(),
                  },
                ],
              },
            ],
          },
          {
            type: 'directory',
            name: 'controllers',
            children: [
              {
                type: 'directory',
                name: 'api',
                children: [
                  {
                    type: 'directory',
                    name: 'v1',
                    children: [
                      {
                        type: 'file',
                        name: 'ServerController.ts',
                        content: this.generateServerController(),
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'directory',
            name: 'types',
            children: [
              {
                type: 'directory',
                name: 'requests',
                children: [
                  {
                    type: 'directory',
                    name: 'api',
                    children: [
                      {
                        type: 'directory',
                        name: 'v1',
                        children: [{ type: 'file', name: '.gitkeep', content: '' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'directory',
                name: 'responses',
                children: [
                  {
                    type: 'directory',
                    name: 'api',
                    children: [
                      {
                        type: 'directory',
                        name: 'v1',
                        children: [
                          {
                            type: 'file',
                            name: 'ServerStatusResponse.ts',
                            content: this.generateServerStatusResponse(),
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'directory',
            name: 'models',
            children: [{ type: 'file', name: 'User.ts', content: this.generateUserModel() }],
          },
          {
            type: 'directory',
            name: 'repositories',
            children: [{ type: 'file', name: '.gitkeep', content: '' }],
          },
          {
            type: 'directory',
            name: 'routes',
            children: [{ type: 'file', name: 'api.ts', content: this.generateApiRoutes() }],
          },
          {
            type: 'directory',
            name: 'providers',
            children: [
              {
                type: 'file',
                name: 'index.ts',
                content: this.generateProvidersIndex(),
              },
              {
                type: 'file',
                name: 'AppServiceProvider.ts',
                content: this.generateAppServiceProvider(context),
              },
              {
                type: 'file',
                name: 'MiddlewareProvider.ts',
                content: this.generateMiddlewareProvider(),
              },
              {
                type: 'file',
                name: 'RouteProvider.ts',
                content: this.generateRouteProvider(),
              },
            ],
          },
          { type: 'file', name: 'bootstrap.ts', content: this.generateBootstrap(context) },
        ],
      },
      {
        type: 'directory',
        name: 'tests',
        children: [{ type: 'file', name: '.gitkeep', content: '' }],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────
  // Config Generators
  // ─────────────────────────────────────────────────────────────

  private generateAppConfig(context: GeneratorContext): string {
    return `export default {
  name: process.env.APP_NAME ?? '${context.name}',
  env: process.env.APP_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  VIEW_DIR: process.env.VIEW_DIR ?? 'src/views',
  debug: process.env.APP_DEBUG === 'true',
  url: process.env.APP_URL ?? 'http://localhost:3000',
  key: process.env.APP_KEY,
}
`
  }

  private generateDatabaseConfig(): string {
    return `export default {
  default: process.env.DB_CONNECTION ?? 'sqlite',
  connections: {
    sqlite: {
      driver: 'sqlite',
      database: process.env.DB_DATABASE ?? 'database/database.sqlite',
    },
  },
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Model Generators
  // ─────────────────────────────────────────────────────────────

  private generateUserModel(): string {
    return `/**
 * User Model
 */

import { Model, column } from '@gravito/atlas'

/**
 * Represents a user in the system.
 */
export class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  id!: number

  @column()
  name!: string

  @column()
  email!: string

  @column()
  created_at!: Date

  @column()
  updated_at!: Date
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Action Generators
  // ─────────────────────────────────────────────────────────────

  /**
   * Generates the base Action class source code.
   *
   * @returns The complete source code for the abstract Action class.
   */
  private generateActionBase(): string {
    return `/**
 * Action Base Class
 *
 * All business logic actions should extend this class.
 * It enforces a consistent execution method.
 */

export abstract class Action<TInput = unknown, TOutput = unknown> {
  /**
   * Execute the business logic.
   */
  abstract execute(input: TInput): Promise<TOutput> | TOutput
}
`
  }

  /**
   * Generates the GetServerStatusAction source code.
   *
   * @returns The complete source code for the example action.
   */
  private generateGetServerStatusAction(): string {
    return `/**
 * Get Server Status Action
 */

import { Action } from '../Action'
import type { ServerStatusResponse } from '../../types/responses/api/v1/ServerStatusResponse'

export class GetServerStatusAction extends Action<void, ServerStatusResponse> {
  execute(): Promise<ServerStatusResponse> {
    return Promise.resolve({
      status: 'active',
      timestamp: new Date().toISOString(),
      service: 'Gravito Hub'
    })
  }
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Controller Generators
  // ─────────────────────────────────────────────────────────────

  /**
   * Generates the Server Controller source code.
   *
   * @returns The complete source code for the ServerController class.
   */
  private generateServerController(): string {
    return `/**
 * Server Controller
 */

import type { GravitoContext } from '@gravito/core'
import { GetServerStatusAction } from '../../../actions/server/GetServerStatusAction'

export class ServerController {
  /**
   * GET /v1/server/status
   */
  async status(c: GravitoContext) {
    const action = new GetServerStatusAction()
    const result = await action.execute()
    
    return c.json({
      success: true,
      data: result
    })
  }
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Type Generators
  // ─────────────────────────────────────────────────────────────

  /**
   * Generates the ServerStatusResponse type definition.
   *
   * @returns The complete source code for the response interface.
   */
  private generateServerStatusResponse(): string {
    return `/**
 * Server Status Response Type
 */

export interface ServerStatusResponse {
  status: string
  timestamp: string
  service: string
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Routes & Bootstrap
  // ─────────────────────────────────────────────────────────────

  /**
   * Generates the API routes registration function.
   *
   * @returns The complete source code for the api.ts routes file.
   */
  private generateApiRoutes(): string {
    return `/**
 * API Routes Registration
 */

import type { Router } from '@gravito/core'
import { ServerController } from '../controllers/api/v1/ServerController'

export function registerApiRoutes(router: Router) {
  const server = new ServerController()

  router.prefix('/v1').group((group) => {
    // Server Domain
    group.get('/server/status', (c) => server.status(c))
  })
}
`
  }

  /**
   * Generates the App Service Provider source code.
   *
   * @param context - The generator context containing project details.
   * @returns The complete source code for AppServiceProvider.
   */
  private generateAppServiceProvider(context: GeneratorContext): string {
    return `/**
 * App Service Provider
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'

export class AppServiceProvider extends ServiceProvider {
  register(_container: Container): void {
    // Register global services here
  }

  boot(core: PlanetCore): void {
    core.logger.info('${context.name} (Action Domain) booted!')
  }
}
`
  }

  private generateProvidersIndex(): string {
    return `/**
 * Application Service Providers
 */

export { AppServiceProvider } from './AppServiceProvider'
export { MiddlewareProvider } from './MiddlewareProvider'
export { RouteProvider } from './RouteProvider'
`
  }

  /**
   * Generates the Middleware Service Provider source code.
   *
   * @returns The complete source code for MiddlewareProvider.
   */
  private generateMiddlewareProvider(): string {
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
    core.adapter.use('*', securityHeaders())
    core.adapter.use('*', bodySizeLimit(1024 * 1024))
    core.logger.info('🛡️ Middleware registered')
  }
}
`
  }

  /**
   * Generates the Route Service Provider source code.
   *
   * @returns The complete source code for RouteProvider.
   */
  private generateRouteProvider(): string {
    return `/**
 * Route Service Provider
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'
import { registerApiRoutes } from '../routes/api'

export class RouteProvider extends ServiceProvider {
  register(_container: Container): void {}

  boot(core: PlanetCore): void {
    registerApiRoutes(core.router)
    core.logger.info('🛤️ Routes registered')
  }
}
`
  }

  private generateBootstrap(_context: GeneratorContext): string {
    return `/**
 * Application Bootstrap
 *
 * Uses the ServiceProvider pattern for modular initialization.
 */

import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitAtlas } from '@gravito/atlas'
import appConfig from '../config/app'
import {
  AppServiceProvider,
  MiddlewareProvider,
  RouteProvider,
} from './providers'

export async function bootstrap() {
  const config = defineConfig({
    config: appConfig,
    orbits: [new OrbitAtlas()],
  })

  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  core.register(new AppServiceProvider())
  core.register(new MiddlewareProvider())
  core.register(new RouteProvider())

  await core.bootstrap()

  return core
}

const core = await bootstrap()
export default core.liftoff()
`
  }

  protected generateArchitectureDoc(context: GeneratorContext): string {
    return `# ${context.name} - Action Domain Architecture

## Overview

This project uses the **Action Domain** pattern, designed for high-clarity API implementations.

## Service Providers

Service providers are the central place to configure your application. They follow the ServiceProvider pattern with \`register()\` and \`boot()\` lifecycle methods.

## Directory Structure

\`\`\`
src/
├── actions/           # Single Responsibility Business Logic
│   ├── Action.ts      # Base Action class
│   └── [Domain]/      # Domain-specific actions
├── controllers/       # HTTP Request Handlers
│   └── api/v1/        # API Controllers
├── types/             # TypeScript Definitions
├── repositories/      # Data Access Layer
├── routes/            # Route Definitions
├── providers/         # Service Providers
└── config/            # Configuration
\`\`\`

## Core Concepts

### Actions
Every business operation is an "Action". An action:
- Does ONE thing.
- Takes specific input.
- Returns specific output.
- Is framework-agnostic (ideally).

### Controllers
Controllers are thin. They:
1. Parse the request.
2. Instantiate/Call the Action.
3. Return the response.

Created with ❤️ using Gravito Framework
`
  }

  protected override generatePackageJson(context: GeneratorContext): string {
    const pkg = {
      name: context.nameKebabCase,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'bun run --watch src/bootstrap.ts',
        build: 'bun build ./src/bootstrap.ts --outdir ./dist --target bun',
        start: 'bun run dist/bootstrap.js',
        test: 'bun test',
        typecheck: 'bun tsc --noEmit',
        check: 'bun run typecheck && bun run test',
        'check:deps': 'bun run scripts/check-dependencies.ts',
        validate: 'bun run check && bun run check:deps',
        precommit: 'bun run validate',
      },
      dependencies: {
        '@gravito/core': 'workspace:*',
        '@gravito/enterprise': 'workspace:*',
        '@gravito/atlas': 'workspace:*', // Usually needed for repositories
      },
      devDependencies: {
        'bun-types': 'latest',
        typescript: '^5.9.3',
      },
    }

    return JSON.stringify(pkg, null, 2)
  }
}
