/**
 * Database Configuration
 */

export const databaseConfig = {
  connections: {
    default: {
      driver: 'sqlite' as const,
      database: ':memory:',
    },
  },
}
