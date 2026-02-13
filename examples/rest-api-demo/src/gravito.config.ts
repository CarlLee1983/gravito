/**
 * REST API Demo 完整配置
 * 生產級電商系統的最佳實踐範例
 *
 * 環境變數配置參考 .env.example
 */
export const gravitoConfig = {
  // ============================================================================
  // 1. 應用層配置
  // ============================================================================
  app: {
    name: 'REST API Demo',
    version: '0.0.3',
    environment: process.env.NODE_ENV ?? 'development',
    debug: process.env.DEBUG === 'true',
    timezone: process.env.TZ ?? 'UTC',
  },

  // ============================================================================
  // 2. 資料庫配置（PostgreSQL）
  // ============================================================================
  database: {
    default: 'postgres',
    postgres: {
      driver: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'password',
      database: process.env.DB_NAME ?? 'rest_api_demo',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // 連接池配置
      poolMin: parseInt(process.env.DB_POOL_MIN ?? '5'),
      poolMax: parseInt(process.env.DB_POOL_MAX ?? '20'),
      poolIdleTimeout: 30000,
      poolConnectTimeout: 2000,
      // 池管理配置
      enablePoolManagement: true,
      poolHealthCheck: true,
      poolWarmup: true,
      poolAdaptive: true,
    },
  },

  // ============================================================================
  // 3. 快取配置（Redis）
  // ============================================================================
  cache: {
    default: 'redis',
    redis: {
      driver: 'redis',
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB ?? '0'),
      ttl: {
        default: 3600, // 1 小時
        product: 300, // 5 分鐘
        user: 1800, // 30 分鐘
        order: 600, // 10 分鐘
      },
    },
  },

  // ============================================================================
  // 4. 認證配置（Sentinel）
  // ============================================================================
  auth: {
    defaultGuard: process.env.AUTH_GUARD ?? 'jwt',
    guards: {
      jwt: {
        driver: 'jwt',
        secret: process.env.JWT_SECRET ?? 'your-secret-key-change-in-production',
        expiresIn: '24h',
        refreshTokenExpiresIn: '7d',
        algorithms: ['HS256'],
      },
      session: {
        driver: 'session',
        secret: process.env.SESSION_SECRET ?? 'your-session-secret',
        cookieHttpOnly: true,
        cookieSecure: process.env.NODE_ENV === 'production',
        cookieSameSite: 'lax',
        cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    },
    hashAlgorithm: 'bcrypt',
  },

  // ============================================================================
  // 5. 事件系統配置（Signal）
  // ============================================================================
  event: {
    driver: process.env.EVENT_DRIVER ?? 'sync',
    // 背壓管理配置
    backpressure: {
      enabled: true,
      windowSizeMs: 10000,
      warningThreshold: 100,
      criticalThreshold: 500,
      overflowThreshold: 1000,
      hysteresisRatio: 0.8,
    },
    // DLQ 配置
    dlq: {
      enabled: true,
      maxRetries: 3,
      retryDelayMs: 1000,
    },
    // 重試排程器配置（Bull Queue）
    retryScheduler: {
      enabled: process.env.ENABLE_RETRY_SCHEDULER === 'true',
      redisHost: process.env.REDIS_HOST ?? 'localhost',
      redisPort: parseInt(process.env.REDIS_PORT ?? '6379'),
      redisPassword: process.env.REDIS_PASSWORD,
      initialDelay: 1000,
      maxDelay: 60000,
      multiplier: 2,
      maxRetries: 5,
    },
  },

  // ============================================================================
  // 6. 可觀測性配置（OpenTelemetry）
  // ============================================================================
  observability: {
    enabled: process.env.OBSERVABILITY_ENABLED === 'true',
    jaegerEndpoint: process.env.JAEGER_ENDPOINT ?? 'http://localhost:4318/v1/traces',
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT ?? '9090'),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    logFormat: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
  },

  // ============================================================================
  // 7. HTTP 伺服器配置（Photon）
  // ============================================================================
  http: {
    host: process.env.HTTP_HOST ?? '0.0.0.0',
    port: parseInt(process.env.HTTP_PORT ?? '3000'),
    trustProxy: true,
    bodyLimit: '10mb',
    rateLimitEnabled: true,
    rateLimitWindowMs: 60000, // 1 分鐘
    rateLimitMaxRequests: 100,
    corsEnabled: true,
    corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['*'],
    corsCredentials: true,
  },

  // ============================================================================
  // 8. 隊列配置（Bull Queue）
  // ============================================================================
  queue: {
    driver: 'bull',
    redisHost: process.env.REDIS_HOST ?? 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT ?? '6379'),
    redisPassword: process.env.REDIS_PASSWORD,
    defaultConcurrency: 5,
  },
}

export default gravitoConfig
