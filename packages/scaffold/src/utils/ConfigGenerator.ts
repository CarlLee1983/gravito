/**
 * ConfigGenerator - Shared configuration file generator
 *
 * Provides common configuration file generation logic for all generators.
 */

export interface GeneratorContext {
  name: string
  namePascalCase: string
  nameCamelCase: string
  nameSnakeCase: string
  nameKebabCase: string
  targetDir: string
  architecture: string
  packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm'
  year: string
  date: string
  [key: string]: unknown
}

export class ConfigGenerator {
  /**
   * Generate app configuration (simple version for Clean Architecture)
   */
  static generateSimpleAppConfig(context: GeneratorContext): string {
    return `export default {
  name: process.env.APP_NAME ?? '${context.name}',
  env: process.env.APP_ENV ?? 'development',
  debug: process.env.APP_DEBUG === 'true',
  url: process.env.APP_URL ?? 'http://localhost:3000',
  key: process.env.APP_KEY,
}
`
  }

  /**
   * Generate app configuration (detailed version for Enterprise MVC)
   */
  static generateDetailedAppConfig(context: GeneratorContext): string {
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
   * Application port
   */
  port: Number.parseInt(process.env.PORT ?? '3000', 10),

  /**
   * View directory
   */
  VIEW_DIR: process.env.VIEW_DIR ?? 'src/views',

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

  /**
   * Generate database configuration (simple version)
   */
  static generateSimpleDatabaseConfig(): string {
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

  /**
   * Generate database configuration (detailed version)
   */
  static generateDetailedDatabaseConfig(): string {
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

  /**
   * Generate auth configuration
   */
  static generateAuthConfig(): string {
    return `export default {
  defaults: { guard: 'web' },
  guards: {
    web: { driver: 'session', provider: 'users' },
    api: { driver: 'token', provider: 'users' },
  },
}
`
  }

  /**
   * Generate cache configuration
   */
  static generateCacheConfig(): string {
    return `export default {
  default: process.env.CACHE_DRIVER ?? 'memory',
  stores: {
    memory: { driver: 'memory' },
  },
}
`
  }

  /**
   * Generate logging configuration
   */
  static generateLoggingConfig(): string {
    return `export default {
  default: process.env.LOG_CHANNEL ?? 'console',
  channels: {
    console: { driver: 'console', level: process.env.LOG_LEVEL ?? 'debug' },
  },
}
`
  }

  /**
   * Generate view configuration
   */
  static generateViewConfig(): string {
    return `/**
 * View Configuration
 */
export default {
  /**
   * View engine
   */
  engine: 'html',

  /**
   * View directory
   */
  path: 'src/views',

  /**
   * Cache views in production
   */
  cache: process.env.NODE_ENV === 'production',
}
`
  }
}
