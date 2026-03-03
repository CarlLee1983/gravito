import type {
  AtlasConfig,
  AtlasObservabilityConfig,
  ConnectionConfig,
  PostgresConfig,
} from '../types'
export type { AtlasConfig, AtlasObservabilityConfig, ConnectionConfig, PostgresConfig }
/**
 * Define configuration with type checking
 */
export declare function defineConfig(config: AtlasConfig): AtlasConfig
/**
 * Load configuration from environment variables with optional prefix
 * Supports both DATABASE_URL and individual DB_* variables
 *
 * @param connectionName - Name for the connection
 * @param prefix - Optional prefix for environment variables (e.g., 'READ' for DB_READ_*)
 */
export declare function fromEnv(connectionName?: string, prefix?: string): AtlasConfig
