/**
 * Banking Event-Driven 應用配置
 * 使用 CQRS + EDA 模式的銀行後端
 */
export const gravitoConfig = {
  app: {
    name: 'Banking Event-Driven',
    version: '0.0.1',
    environment: process.env.NODE_ENV ?? 'development',
    debug: process.env.DEBUG === 'true',
  },

  http: {
    host: process.env.HTTP_HOST ?? '0.0.0.0',
    port: parseInt(process.env.HTTP_PORT ?? '3000'),
    corsEnabled: true,
    corsOrigins: ['*'],
    corsCredentials: false,
  },

  event: {
    driver: 'sync',
  },
}

export default gravitoConfig
