/**
 * Database Configuration
 */

export const databaseConfig = {
  connections: {
    sqlite: {
      driver: 'sqlite' as const,
      database: process.env.DB_DATABASE || ':memory:',
    },
    postgres: {
      driver: 'postgres' as const,
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_DATABASE || 'gravito_shop',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
    },
  },
  default: process.env.DB_CONNECTION || 'sqlite',
}
