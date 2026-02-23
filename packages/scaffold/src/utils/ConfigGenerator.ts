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
   * Generate database configuration based on driver type
   */
  static generateDatabaseConfig(driver: string): string {
    switch (driver) {
      case 'none':
        return this.generateNoDatabaseConfig()
      case 'sqlite':
        return this.generateSimpleDatabaseConfig()
      case 'postgresql':
      case 'mysql':
        return this.generateDetailedDatabaseConfig()
      default:
        return this.generateNoDatabaseConfig()
    }
  }

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
   * Generate database configuration (no default driver - developer to choose)
   */
  static generateNoDatabaseConfig(): string {
    return `/**
 * Database Configuration
 *
 * Configure your database connection below.
 * Choose one of the following drivers by installing the required package:
 *
 * SQLite:     bun add better-sqlite3
 * PostgreSQL: bun add pg
 * MySQL:      bun add mysql2
 */
export default {
  default: process.env.DB_CONNECTION ?? 'sqlite',

  connections: {
    sqlite: {
      driver: 'sqlite',
      database: process.env.DB_DATABASE ?? 'database/database.sqlite',
    },

    postgresql: {
      driver: 'postgresql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_DATABASE ?? 'forge',
      username: process.env.DB_USERNAME ?? 'forge',
      password: process.env.DB_PASSWORD ?? '',
    },

    mysql: {
      driver: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
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

  /**
   * Generate workers configuration for job queue system
   */
  static generateWorkersConfig(level: 'basic' | 'advanced' | 'production' = 'basic'): string {
    switch (level) {
      case 'advanced':
        return this.generateAdvancedWorkersConfig()
      case 'production':
        return this.generateProductionWorkersConfig()
      case 'basic':
      default:
        return this.generateBasicWorkersConfig()
    }
  }

  /**
   * Generate basic workers configuration
   */
  private static generateBasicWorkersConfig(): string {
    return `  /**
   * Workers Configuration
   *
   * Manages job execution in isolated worker threads.
   * Automatically selects best available runtime (Bun or Node.js).
   */
  workers: {
    // Runtime environment: 'auto' | 'bun' | 'node'
    runtime: process.env.WORKERS_RUNTIME as 'auto' | 'bun' | 'node' ?? 'auto',

    pool: {
      poolSize: Number.parseInt(process.env.WORKERS_POOL_SIZE ?? '4', 10),
      minWorkers: Number.parseInt(process.env.WORKERS_MIN_WORKERS ?? '0', 10),
      healthCheckInterval: 30000,
    },

    execution: {
      maxExecutionTime: Number.parseInt(process.env.WORKERS_MAX_EXECUTION_TIME ?? '30000', 10),
      maxMemory: Number.parseInt(process.env.WORKERS_MAX_MEMORY ?? '0', 10),
      idleTimeout: Number.parseInt(process.env.WORKERS_IDLE_TIMEOUT ?? '60000', 10),
      isolateContexts: process.env.WORKERS_ISOLATE_CONTEXTS === 'true',
    },
  },`
  }

  /**
   * Generate advanced workers configuration with Bun optimizations
   */
  private static generateAdvancedWorkersConfig(): string {
    return `  /**
   * Workers Configuration (Advanced)
   *
   * Manages job execution in isolated worker threads.
   * Includes Bun-specific optimizations for enhanced performance.
   *
   * Performance characteristics:
   * - Bun: 2-241x faster message passing, 20-30% less memory (smol mode)
   * - Node.js: Stable, widely tested, compatible
   */
  workers: {
    runtime: process.env.WORKERS_RUNTIME as 'auto' | 'bun' | 'node' ?? 'auto',

    pool: {
      poolSize: Number.parseInt(process.env.WORKERS_POOL_SIZE ?? '4', 10),
      minWorkers: Number.parseInt(process.env.WORKERS_MIN_WORKERS ?? '1', 10),
      healthCheckInterval: 30000,
    },

    execution: {
      maxExecutionTime: Number.parseInt(process.env.WORKERS_MAX_EXECUTION_TIME ?? '30000', 10),
      maxMemory: Number.parseInt(process.env.WORKERS_MAX_MEMORY ?? '0', 10),
      idleTimeout: Number.parseInt(process.env.WORKERS_IDLE_TIMEOUT ?? '60000', 10),
      isolateContexts: process.env.WORKERS_ISOLATE_CONTEXTS === 'true',
    },

    // Bun-specific optimizations
    bun: {
      smol: process.env.WORKERS_BUN_SMOL === 'true',
      preload: process.env.WORKERS_BUN_PRELOAD
        ? process.env.WORKERS_BUN_PRELOAD.split(',').map((p) => p.trim())
        : undefined,
      inspectPort: process.env.WORKERS_BUN_INSPECT_PORT
        ? Number.parseInt(process.env.WORKERS_BUN_INSPECT_PORT, 10)
        : undefined,
    },
  },`
  }

  /**
   * Generate production-optimized workers configuration
   */
  private static generateProductionWorkersConfig(): string {
    return `  /**
   * Workers Configuration (Production Optimized)
   */
  workers: {
    runtime: 'auto' as const,

    pool: {
      poolSize: Number.parseInt(process.env.WORKERS_POOL_SIZE ?? '8', 10),
      minWorkers: 2,
      healthCheckInterval: 30000,
    },

    execution: {
      maxExecutionTime: 30000,
      maxMemory: Number.parseInt(process.env.WORKERS_MAX_MEMORY ?? '512', 10),
      idleTimeout: 60000,
      isolateContexts: false,
    },

    bun: {
      smol: true,
      preload: process.env.WORKERS_BUN_PRELOAD?.split(',').map((p) => p.trim()),
    },
  },`
  }
}
