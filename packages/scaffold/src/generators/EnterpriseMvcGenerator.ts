/**
 * EnterpriseMvcGenerator - Enterprise MVC Architecture Generator
 *
 * Generates a Laravel-inspired MVC structure with:
 * - Controllers for HTTP handling
 * - Services for business logic
 * - Repositories for data persistence
 * - Http/Kernel for middleware management
 */

import type { DirectoryNode } from '../types'
import { BaseGenerator, type GeneratorContext } from './BaseGenerator'

export class EnterpriseMvcGenerator extends BaseGenerator {
  get architectureType() {
    return 'enterprise-mvc' as const
  }

  get displayName(): string {
    return 'Enterprise MVC'
  }

  get description(): string {
    return 'Laravel-inspired MVC with Services and Repositories for enterprise applications'
  }

  getDirectoryStructure(context: GeneratorContext): DirectoryNode[] {
    return [
      {
        type: 'directory',
        name: 'config',
        children: [
          { type: 'file', name: 'app.ts', content: this.generateAppConfig(context) },
          { type: 'file', name: 'database.ts', content: this.generateDatabaseConfig() },
          { type: 'file', name: 'auth.ts', content: this.generateAuthConfig() },
          { type: 'file', name: 'cache.ts', content: this.generateCacheConfig() },
          { type: 'file', name: 'logging.ts', content: this.generateLoggingConfig() },
        ],
      },
      {
        type: 'directory',
        name: 'src',
        children: [
          {
            type: 'directory',
            name: 'Http',
            children: [
              { type: 'file', name: 'Kernel.ts', content: this.generateHttpKernel() },
              {
                type: 'directory',
                name: 'Controllers',
                children: [
                  { type: 'file', name: 'Controller.ts', content: this.generateBaseController() },
                  {
                    type: 'file',
                    name: 'HomeController.ts',
                    content: this.generateHomeController(context),
                  },
                ],
              },
              {
                type: 'directory',
                name: 'Middleware',
                children: [
                  { type: 'file', name: 'Authenticate.ts', content: this.generateAuthMiddleware() },
                ],
              },
            ],
          },
          {
            type: 'directory',
            name: 'Services',
            children: [{ type: 'file', name: '.gitkeep', content: '' }],
          },
          {
            type: 'directory',
            name: 'Repositories',
            children: [{ type: 'file', name: '.gitkeep', content: '' }],
          },
          {
            type: 'directory',
            name: 'Models',
            children: [{ type: 'file', name: '.gitkeep', content: '' }],
          },
          {
            type: 'directory',
            name: 'Resources',
            children: [{ type: 'file', name: '.gitkeep', content: '' }],
          },
          {
            type: 'directory',
            name: 'Providers',
            children: [
              {
                type: 'file',
                name: 'AppServiceProvider.ts',
                content: this.generateAppServiceProvider(context),
              },
              {
                type: 'file',
                name: 'RouteServiceProvider.ts',
                content: this.generateRouteServiceProvider(context),
              },
            ],
          },
          {
            type: 'directory',
            name: 'Exceptions',
            children: [
              { type: 'file', name: 'Handler.ts', content: this.generateExceptionHandler() },
            ],
          },
          { type: 'file', name: 'bootstrap.ts', content: this.generateBootstrap(context) },
          { type: 'file', name: 'routes.ts', content: this.generateRoutes(context) },
        ],
      },
      {
        type: 'directory',
        name: 'tests',
        children: [
          {
            type: 'directory',
            name: 'Unit',
            children: [{ type: 'file', name: '.gitkeep', content: '' }],
          },
          {
            type: 'directory',
            name: 'Feature',
            children: [{ type: 'file', name: '.gitkeep', content: '' }],
          },
        ],
      },
      {
        type: 'directory',
        name: 'database',
        children: [
          {
            type: 'directory',
            name: 'migrations',
            children: [{ type: 'file', name: '.gitkeep', content: '' }],
          },
          {
            type: 'directory',
            name: 'seeders',
            children: [{ type: 'file', name: '.gitkeep', content: '' }],
          },
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────
  // Config Generators
  // ─────────────────────────────────────────────────────────────

  private generateAppConfig(context: GeneratorContext): string {
    return `/**
 * Application Configuration
 */
export default {
  /**
   * Application name
   */
  name: process.env.APP_NAME ?? '${context.name}',

  /**
   * Application environment
   */
  env: process.env.APP_ENV ?? 'development',

  /**
   * Debug mode
   */
  debug: process.env.APP_DEBUG === 'true',

  /**
   * Application URL
   */
  url: process.env.APP_URL ?? 'http://localhost:3000',

  /**
   * Timezone
   */
  timezone: 'UTC',

  /**
   * Locale
   */
  locale: 'en',

  /**
   * Fallback locale
   */
  fallbackLocale: 'en',

  /**
   * Encryption key
   */
  key: process.env.APP_KEY,

  /**
   * Service providers to register
   */
  providers: [
    // Framework providers
    // 'RouteServiceProvider',

    // Application providers
    // 'AppServiceProvider',
  ],
}
`
  }

  private generateDatabaseConfig(): string {
    return `/**
 * Database Configuration
 */
export default {
  /**
   * Default connection
   */
  default: process.env.DB_CONNECTION ?? 'sqlite',

  /**
   * Database connections
   */
  connections: {
    sqlite: {
      driver: 'sqlite',
      database: process.env.DB_DATABASE ?? 'database/database.sqlite',
    },

    mysql: {
      driver: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      database: process.env.DB_DATABASE ?? 'forge',
      username: process.env.DB_USERNAME ?? 'forge',
      password: process.env.DB_PASSWORD ?? '',
    },

    postgres: {
      driver: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_DATABASE ?? 'forge',
      username: process.env.DB_USERNAME ?? 'forge',
      password: process.env.DB_PASSWORD ?? '',
    },
  },

  /**
   * Migration settings
   */
  migrations: {
    table: 'migrations',
    path: 'database/migrations',
  },
}
`
  }

  private generateAuthConfig(): string {
    return `/**
 * Authentication Configuration
 */
export default {
  /**
   * Default guard
   */
  defaults: {
    guard: 'web',
  },

  /**
   * Authentication guards
   */
  guards: {
    web: {
      driver: 'session',
      provider: 'users',
    },

    api: {
      driver: 'token',
      provider: 'users',
    },
  },

  /**
   * User providers
   */
  providers: {
    users: {
      driver: 'database',
      table: 'users',
    },
  },
}
`
  }

  private generateCacheConfig(): string {
    return `/**
 * Cache Configuration
 */
export default {
  /**
   * Default cache driver
   */
  default: process.env.CACHE_DRIVER ?? 'memory',

  /**
   * Cache stores
   */
  stores: {
    memory: {
      driver: 'memory',
    },

    file: {
      driver: 'file',
      path: 'storage/cache',
    },

    redis: {
      driver: 'redis',
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD ?? null,
      database: Number(process.env.REDIS_CACHE_DB ?? 0),
    },
  },

  /**
   * Cache key prefix
   */
  prefix: 'app_cache_',
}
`
  }

  private generateLoggingConfig(): string {
    return `/**
 * Logging Configuration
 */
export default {
  /**
   * Default log channel
   */
  default: process.env.LOG_CHANNEL ?? 'console',

  /**
   * Log channels
   */
  channels: {
    console: {
      driver: 'console',
      level: process.env.LOG_LEVEL ?? 'debug',
    },

    file: {
      driver: 'file',
      path: 'storage/logs/app.log',
      level: process.env.LOG_LEVEL ?? 'debug',
    },
  },
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Core File Generators
  // ─────────────────────────────────────────────────────────────

  private generateHttpKernel(): string {
    return `/**
 * HTTP Kernel
 *
 * The HTTP kernel is the central point for managing HTTP middleware.
 * Global middleware runs on every request, while route middleware
 * can be assigned to specific routes.
 */

import type { GravitoMiddleware } from 'gravito-core'

/**
 * Global middleware stack.
 * These middleware are run during every request.
 */
export const globalMiddleware: GravitoMiddleware[] = [
  // Add global middleware here
]

/**
 * Route middleware groups.
 * These can be assigned to routes using the middleware name.
 */
export const middlewareGroups: Record<string, GravitoMiddleware[]> = {
  web: [
    // Session middleware
    // CSRF middleware
  ],
  api: [
    // Rate limiting
    // API authentication
  ],
}

/**
 * Route middleware aliases.
 * Convenient names for middleware that can be assigned to routes.
 */
export const routeMiddleware: Record<string, GravitoMiddleware> = {
  // auth: AuthenticateMiddleware,
  // guest: RedirectIfAuthenticated,
  // throttle: ThrottleRequests,
}

/**
 * Middleware priority.
 * Determines the order in which middleware are executed.
 */
export const middlewarePriority: string[] = [
  // StartSession
  // ShareErrorsFromSession
  // AuthenticateSession
  // SubstituteBindings
  // Authorize
]
`
  }

  private generateBaseController(): string {
    return `/**
 * Base Controller
 *
 * All controllers should extend this base class.
 * Provides common functionality and helper methods.
 */

export abstract class Controller {
  /**
   * Create a success response.
   */
  protected success<T>(data: T, message = 'Success') {
    return {
      success: true,
      message,
      data,
    }
  }

  /**
   * Create an error response.
   */
  protected error(message: string, code = 'ERROR', details?: unknown) {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
    }
  }
}
`
  }

  private generateHomeController(context: GeneratorContext): string {
    return `/**
 * Home Controller
 */

import type { GravitoContext } from 'gravito-core'
import { Controller } from './Controller'

export class HomeController extends Controller {
  /**
   * Display the home page.
   */
  async index(c: GravitoContext) {
    return c.json(this.success({
      name: '${context.name}',
      message: 'Welcome to your new Gravito application!',
      architecture: 'Enterprise MVC',
    }))
  }

  /**
   * Health check endpoint.
   */
  async health(c: GravitoContext) {
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    })
  }
}
`
  }

  private generateAuthMiddleware(): string {
    return `/**
 * Authenticate Middleware
 *
 * Protects routes that require authentication.
 */

import type { GravitoContext, GravitoNext } from 'gravito-core'

export async function Authenticate(c: GravitoContext, next: GravitoNext) {
  // TODO: Implement authentication check
  // const session = c.get('session')
  // if (!session?.user) {
  //   return c.json({ error: 'Authentication required' }, 401)
  // }

  await next()
}
`
  }

  private generateAppServiceProvider(context: GeneratorContext): string {
    return `/**
 * App Service Provider
 *
 * This is the main application service provider.
 * Register and bootstrap application services here.
 */

import { ServiceProvider, type Container, type PlanetCore } from 'gravito-core'

export class AppServiceProvider extends ServiceProvider {
  /**
   * Register any application services.
   */
  register(container: Container): void {
    // Register services
    // container.singleton('myService', () => new MyService())
  }

  /**
   * Bootstrap any application services.
   */
  boot(core: PlanetCore): void {
    // Bootstrap services
    console.log('${context.name} application booted!')
  }
}
`
  }

  private generateRouteServiceProvider(_context: GeneratorContext): string {
    return `/**
 * Route Service Provider
 *
 * Configures and registers application routes.
 */

import { ServiceProvider, type Container, type PlanetCore } from 'gravito-core'
import { registerRoutes } from '../routes'

export class RouteServiceProvider extends ServiceProvider {
  /**
   * Register any application services.
   */
  register(_container: Container): void {
    // Routes are registered in boot
  }

  /**
   * Bootstrap any application services.
   */
  boot(core: PlanetCore): void {
    registerRoutes(core.router)
  }
}
`
  }

  private generateExceptionHandler(): string {
    return `/**
 * Exception Handler
 *
 * Handles all exceptions thrown by the application.
 * Customize error responses and logging here.
 */

import type { ErrorHandlerContext } from 'gravito-core'

/**
 * Report an exception (logging, monitoring, etc.)
 */
export function report(error: unknown, context: ErrorHandlerContext): void {
  // Log to external service (Sentry, etc.)
  if (!context.isProduction) {
    console.error('[Exception Handler]', error)
  }
}

/**
 * Determine if the exception should be reported.
 */
export function shouldReport(error: unknown): boolean {
  // Don't report 4xx errors
  if (error instanceof Error && 'status' in error) {
    const status = (error as any).status
    if (status >= 400 && status < 500) {
      return false
    }
  }

  return true
}

/**
 * A list of exception types that should not be reported.
 */
export const dontReport: string[] = [
  'ValidationException',
  'NotFoundException',
]
`
  }

  private generateBootstrap(context: GeneratorContext): string {
    const spectrumImport = context.withSpectrum
      ? "import { SpectrumOrbit } from '@gravito/spectrum'\n"
      : ''
    const spectrumOrbit = context.withSpectrum
      ? `
// Enable Debug Dashboard
if (process.env.APP_DEBUG === 'true') {
  await core.orbit(new SpectrumOrbit())
}
`
      : ''

    return `/**
 * Application Bootstrap
 *
 * This is the entry point for your application.
 * It initializes the core and registers all providers.
 */

import { PlanetCore } from 'gravito-core'
${spectrumImport}import { AppServiceProvider } from './Providers/AppServiceProvider'
import { RouteServiceProvider } from './Providers/RouteServiceProvider'

// Load environment variables
// Bun automatically loads .env

// Create application core
const core = new PlanetCore({
  config: {
    APP_NAME: '\${process.env.APP_NAME ?? '${context.name}'}',
  },
})
${spectrumOrbit}
// Register service providers
core.register(new AppServiceProvider())
core.register(new RouteServiceProvider())

// Bootstrap the application
await core.bootstrap()

// Export for Bun.serve()
export default core.liftoff()
`
  }

  private generateRoutes(_context: GeneratorContext): string {
    return `/**
 * Application Routes
 *
 * Define your application routes here.
 */

import { HomeController } from './Http/Controllers/HomeController'

export function registerRoutes(router: any): void {
  const home = new HomeController()

  // API Routes
  router.get('/api', (c: any) => home.index(c))
  router.get('/api/health', (c: any) => home.health(c))

  // Web Routes
  router.get('/', (c: any) => home.index(c))
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Architecture Documentation
  // ─────────────────────────────────────────────────────────────

  protected generateArchitectureDoc(context: GeneratorContext): string {
    return `# ${context.name} - Architecture Guide

## Overview

This project uses **Enterprise MVC Architecture**, inspired by Laravel's conventions.
It provides a clear separation of concerns while remaining pragmatic and easy to understand.

## Directory Structure

\`\`\`
${context.name}/
├── config/                 # Configuration files
│   ├── app.ts             # Application settings
│   ├── database.ts        # Database connections
│   ├── auth.ts            # Authentication settings
│   ├── cache.ts           # Cache configuration
│   └── logging.ts         # Logging channels
├── src/
│   ├── Http/
│   │   ├── Kernel.ts      # HTTP middleware management
│   │   ├── Controllers/   # HTTP request handlers
│   │   └── Middleware/    # Request/Response interceptors
│   ├── Services/          # Business logic layer
│   ├── Repositories/      # Data access layer
│   ├── Models/            # Data models/entities
│   ├── Resources/         # API response transformers
│   ├── Providers/         # Service providers
│   ├── Exceptions/        # Custom exceptions
│   ├── bootstrap.ts       # Application entry point
│   └── routes.ts          # Route definitions
├── tests/
│   ├── Unit/              # Unit tests
│   └── Feature/           # Integration tests
└── database/
    ├── migrations/        # Database migrations
    └── seeders/           # Database seeders
\`\`\`

## Request Flow

\`\`\`
Request
   │
   ▼
┌─────────────────┐
│  Http/Kernel    │ ──▶ Global Middleware
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Router       │ ──▶ Route Matching
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Controller     │ ──▶ Request Handling
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Service      │ ──▶ Business Logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Repository     │ ──▶ Data Access
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Resource      │ ──▶ Response Transform
└────────┬────────┘
         │
         ▼
     Response
\`\`\`

## Layer Responsibilities

### Controllers
- Handle HTTP requests and responses
- Validate input (or delegate to Form Requests)
- Call services for business logic
- Return transformed responses

### Services
- Contain business logic
- Orchestrate multiple repositories
- Enforce business rules
- Should be framework-agnostic

### Repositories
- Abstract data access
- Handle database queries
- Return domain objects

### Resources
- Transform models for API responses
- Control what data is exposed
- Handle nested relationships

## Getting Started

\`\`\`bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run tests
bun test
\`\`\`

## Configuration

All configuration is in the \`config/\` directory.
Environment-specific values should use environment variables.

## Service Providers

Service providers are the central place to configure your application.
They are registered in \`src/bootstrap.ts\`:

\`\`\`typescript
core.register(new AppServiceProvider())
core.register(new RouteServiceProvider())
\`\`\`

Created with ❤️ using Gravito Framework
`
  }
}
