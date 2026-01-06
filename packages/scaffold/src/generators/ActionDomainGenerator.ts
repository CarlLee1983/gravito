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
                name: 'AppServiceProvider.ts',
                content: this.generateAppServiceProvider(context),
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

  private generateAppServiceProvider(context: GeneratorContext): string {
    return `/**
 * App Service Provider
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'

export class AppServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // Register global services here
  }

  boot(core: PlanetCore): void {
    core.logger.info('${context.name} (Action Domain) booted!')
  }
}
`
  }

  private generateBootstrap(context: GeneratorContext): string {
    return `/**
 * Application Entry Point
 */

import { PlanetCore, securityHeaders, bodySizeLimit } from '@gravito/core'
import { OrbitAtlas } from '@gravito/atlas'
import databaseConfig from '../config/database'
import { AppServiceProvider } from './providers/AppServiceProvider'
import { registerApiRoutes } from './routes/api'

// Initialize Core
const core = new PlanetCore({
  config: { 
    APP_NAME: '${context.name}',
    database: databaseConfig
  },
})

// Middleware
core.adapter.use('*', securityHeaders())
core.adapter.use('*', bodySizeLimit(1024 * 1024)) // 1MB

// Install Orbits
await core.orbit(new OrbitAtlas())

// Service Providers
core.register(new AppServiceProvider())

// Bootstrap
await core.bootstrap()

// Routes
registerApiRoutes(core.router)

// Liftoff
export default core.liftoff()
`
  }

  protected generateArchitectureDoc(context: GeneratorContext): string {
    return (
      '# ' +
      context.name +
      ' - Action Domain Architecture\n\n' +
      '## Overview\n\n' +
      'This project uses the **Action Domain** pattern, designed for high-clarity API implementations.\n\n' +
      '## Directory Structure\n\n' +
      '```\n' +
      'src/\n' +
      '├── actions/           # Single Responsibility Business Logic\n' +
      '│   ├── Action.ts      # Base Action class\n' +
      '│   └── [Domain]/      # Domain-specific actions\n' +
      '├── controllers/       # HTTP Request Handlers\n' +
      '│   └── api/v1/        # API Controllers\n' +
      '├── types/             # TypeScript Definitions\n' +
      '│   ├── requests/      # Request Payloads\n' +
      '│   └── responses/     # Response Structures\n' +
      '├── repositories/      # Data Access Layer\n' +
      '├── routes/            # Route Definitions\n' +
      '└── config/            # Configuration\n' +
      '```\n\n' +
      '## Core Concepts\n\n' +
      '### Actions\n' +
      'Every business operation is an "Action". An action:\n' +
      '- Does ONE thing.\n' +
      '- Takes specific input.\n' +
      '- Returns specific output.\n' +
      '- Is framework-agnostic (ideally).\n\n' +
      '### Controllers\n' +
      'Controllers are thin. They:\n' +
      '1. Parse the request.\n' +
      '2. Instantiate/Call the Action.\n' +
      '3. Return the response.\n\n' +
      'Created with ❤️ using Gravito Framework\n'
    )
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
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        '@gravito/core': 'workspace:*',
        '@gravito/enterprise': 'workspace:*',
        '@gravito/atlas': 'workspace:*', // Usually needed for repositories
      },
      devDependencies: {
        'bun-types': 'latest',
        typescript: '^5.0.0',
      },
    }

    return JSON.stringify(pkg, null, 2)
  }
}
