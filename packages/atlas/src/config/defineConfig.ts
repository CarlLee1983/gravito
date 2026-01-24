import type { ConnectionConfig, PostgresConfig } from '../types'

/**
 * Atlas configuration structure
 */
export interface AtlasConfig {
  /**
   * The default connection name to use
   */
  default: string

  /**
   * Map of connection names to their configurations
   */
  connections: Record<string, ConnectionConfig>
}

/**
 * Define configuration with type checking
 */
export function defineConfig(config: AtlasConfig): AtlasConfig {
  return config
}

/**
 * Load configuration from environment variables with optional prefix
 * Supports both DATABASE_URL and individual DB_* variables
 *
 * @param connectionName - Name for the connection
 * @param prefix - Optional prefix for environment variables (e.g., 'READ' for DB_READ_*)
 */
export function fromEnv(connectionName = 'default', prefix = ''): AtlasConfig {
  const env = prefix ? getPrefixedEnv(prefix) : process.env
  // Priority 1: DATABASE_URL (single connection)
  const urlKey = prefix ? `${prefix}_DATABASE_URL` : 'DATABASE_URL'
  const url = env[urlKey] || env.DATABASE_URL
  if (url) {
    return {
      default: connectionName,
      connections: {
        [connectionName]: parseConnectionUrl(url),
      },
    }
  }

  // Priority 2: Individual environment variables
  const driverKey = prefix ? `${prefix}_DB_DRIVER` : 'DB_DRIVER'
  const connectionKey = prefix ? `${prefix}_DB_CONNECTION` : 'DB_CONNECTION'
  const driver = (env[driverKey] ||
    env[connectionKey] ||
    env.DB_DRIVER ||
    env.DB_CONNECTION) as ConnectionConfig['driver']
  if (!driver) {
    throw new Error(
      `Database configuration not found for ${prefix || 'default'}. ` +
        `Set ${urlKey} or ${driverKey} environment variable.`
    )
  }

  const getEnv = (key: string, defaultValue?: string): string | undefined => {
    if (prefix) {
      return env[`${prefix}_${key}`] || env[key] || defaultValue
    }
    return env[key] || defaultValue
  }

  const config: ConnectionConfig = {
    driver,
    host: getEnv('DB_HOST', getDefaultHost(driver)),
    port: getEnv('DB_PORT') ? Number.parseInt(getEnv('DB_PORT')!, 10) : getDefaultPort(driver),
    database: getEnv('DB_DATABASE'),
    username: getEnv('DB_USERNAME') || getEnv('DB_USER'),
    password: getEnv('DB_PASSWORD'),
    charset: getEnv('DB_CHARSET'),
    timezone: getEnv('DB_TIMEZONE'),
  }

  // SSL configuration
  const sslValue = getEnv('DB_SSL')
  if (sslValue === 'true' || sslValue === '1') {
    config.ssl = true
  }

  // PostgreSQL specific
  if (driver === 'postgres' && getEnv('DB_SCHEMA')) {
    ;(config as PostgresConfig).schema = getEnv('DB_SCHEMA')!
  }

  // Pool configuration
  const poolMin = getEnv('DB_POOL_MIN')
  const poolMax = getEnv('DB_POOL_MAX')
  if (poolMin || poolMax) {
    config.pool = {
      ...config.pool,
      ...(poolMin && { min: Number.parseInt(poolMin, 10) }),
      ...(poolMax && { max: Number.parseInt(poolMax, 10) }),
    }
  }

  return {
    default: connectionName,
    connections: {
      [connectionName]: config,
    },
  }
}

/**
 * Get default host for driver
 */
function getDefaultHost(driver: string): string | undefined {
  const hosts: Record<string, string> = {
    postgres: 'localhost',
    mysql: 'localhost',
    mariadb: 'localhost',
    sqlite: undefined as unknown as string,
    redis: 'localhost',
    mongodb: 'localhost',
  }
  return hosts[driver]
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
    port: parsed.port ? Number.parseInt(parsed.port, 10) : getDefaultPort(driver),
    database: parsed.pathname.slice(1),
    username: parsed.username,
    password: parsed.password,
  }

  // Parse query parameters (e.g., ?ssl=true&schema=public)
  for (const [key, value] of parsed.searchParams.entries()) {
    if (key === 'ssl') {
      config.ssl = value === 'true'
    } else if (key === 'schema') {
      if (driver === 'postgres') {
        ;(config as PostgresConfig).schema = value
      }
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

/**
 * Get environment variables with prefix
 * Maps PREFIX_DB_* to DB_* for easier access
 */
function getPrefixedEnv(prefix: string): NodeJS.ProcessEnv {
  const prefixed: NodeJS.ProcessEnv = { ...process.env }
  const prefixUpper = prefix.toUpperCase()

  // Map PREFIX_DB_* to DB_* for compatibility
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith(`${prefixUpper}_DB_`)) {
      const dbKey = key.replace(`${prefixUpper}_DB_`, 'DB_')
      prefixed[dbKey] = process.env[key]
    }
    // Also support PREFIX_DATABASE_URL
    if (key === `${prefixUpper}_DATABASE_URL`) {
      prefixed.DATABASE_URL = process.env[key]
    }
  })

  return prefixed
}
