/**
 * Cache Configuration
 *
 * Defines cache stores and default cache driver.
 * This configuration is used by @gravito/stasis cache orbit.
 *
 * Enterprise profile: Configured for production with Redis as default.
 *
 * Supported drivers: 'memory', 'file', 'null', 'redis'
 */
export default {
  default: process.env.CACHE_DRIVER || 'redis',
  stores: {
    // Redis - Redis 快取（生產環境推薦）
    redis: {
      driver: 'redis',
      connection: process.env.REDIS_CACHE_CONNECTION || 'default',
      prefix: process.env.REDIS_CACHE_PREFIX || 'cache:',
    },
    // Memory - 記憶體快取（開發/測試環境）
    memory: {
      driver: 'memory',
      maxItems: 10_000,
    },
    // File - 檔案快取
    file: {
      driver: 'file',
      path: process.env.CACHE_PATH || 'storage/framework/cache',
    },
  },
} as const
