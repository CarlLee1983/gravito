/**
 * Database Configuration
 *
 * Defines database connections and default connection driver.
 * This configuration is used by @gravito/atlas ORM.
 *
 * Scale profile: Configured for high-scale scenarios with PostgreSQL as default.
 */
export default {
  default: process.env.DB_CONNECTION || 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_DATABASE || 'gravito',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8',
      search_path: 'public',
      sslmode: process.env.DB_SSLMODE || 'prefer',
    },
    mysql: {
      driver: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_DATABASE || 'gravito',
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
    },
  },
} as const
