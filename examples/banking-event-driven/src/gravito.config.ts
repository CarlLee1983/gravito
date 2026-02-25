/**
 * Banking Event-Driven Application Configuration
 * Configures the CQRS + EDA (Event-Driven Architecture) banking backend.
 */
export const gravitoConfig = {
  /** Application metadata */
  app: {
    name: 'Banking Event-Driven',
    version: '0.0.1',
    environment: process.env.NODE_ENV ?? 'development',
    debug: process.env.DEBUG === 'true',
  },

  /** HTTP server settings */
  http: {
    host: process.env.HTTP_HOST ?? '0.0.0.0',
    port: parseInt(process.env.HTTP_PORT ?? '3000', 10),
    corsEnabled: true,
    corsOrigins: ['*'],
    corsCredentials: false,
  },

  /** Event bus settings */
  event: {
    driver: 'sync',
  },
}

export default gravitoConfig
