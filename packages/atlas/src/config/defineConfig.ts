import type { ConnectionConfig } from '../types'

export interface AtlasConfig {
  default: string
  connections: Record<string, ConnectionConfig>
}

/**
 * Define configuration with type checking
 */
export function defineConfig(config: AtlasConfig): AtlasConfig {
  return config
}

/**
 * Load configuration from environment variables
 */
export function fromEnv(): AtlasConfig {
  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error('DATABASE_URL environment variable not found')
  }

  return {
    default: 'default',
    connections: {
      default: parseConnectionUrl(url),
    },
  }
}

/**
 * Parse DATABASE_URL into connection config
 */
function parseConnectionUrl(url: string): ConnectionConfig {
  const parsed = new URL(url)

  const driver = parsed.protocol.replace(':', '') as 'postgres' | 'mysql' | 'sqlite'

  const config: ConnectionConfig = {
    driver,
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port) : getDefaultPort(driver),
    database: parsed.pathname.slice(1),
    username: parsed.username,
    password: parsed.password,
  }

  // Parse query parameters (e.g., ?ssl=true&schema=public)
  for (const [key, value] of parsed.searchParams.entries()) {
    if (key === 'ssl') {
      config.ssl = value === 'true'
    } else if (key === 'schema') {
      ;(config as any).schema = value
    }
  }

  return config
}

function getDefaultPort(driver: string): number {
  const ports: Record<string, number> = {
    postgres: 5432,
    mysql: 3306,
    mariadb: 3306,
    sqlite: 0,
    redis: 6379,
    mongodb: 27017,
  }
  return ports[driver] || 0
}
