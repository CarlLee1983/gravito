export interface AppConfig {
  port?: number
  name?: string
  version?: string
}

export const appConfig = (options: AppConfig = {}) => ({
  PORT: options.port || 3001,
  APP_NAME: options.name || 'Gravito Blog MVC',
  APP_VERSION: options.version || '1.0.0',
  APP_KEY: 'bWVnYS1zZWNyZXQta2V5LXNob3VsZC1iZS0zMi1ieXRlcw==', // Dummy base64 key
  VIEW_DIR: 'src/views',
})
