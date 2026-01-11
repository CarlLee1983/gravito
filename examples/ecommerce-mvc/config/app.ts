/**
 * Application Configuration
 */

export interface AppConfig {
  name?: string
  env?: string
  port?: number
}

export function appConfig(options: AppConfig = {}) {
  return {
    name: options.name ?? process.env.APP_NAME ?? 'Gravito E-Commerce',
    env: options.env ?? process.env.NODE_ENV ?? 'development',
    port: options.port ?? Number.parseInt(process.env.PORT ?? '3070', 10),
  }
}
