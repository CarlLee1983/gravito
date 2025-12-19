/**
 * Configuration manager (ConfigManager)
 *
 * Unifies environment variables and application configuration access.
 */
export declare class ConfigManager {
  private config
  constructor(initialConfig?: Record<string, unknown>)
  /**
   * Load all environment variables from `Bun.env`.
   */
  private loadEnv
  /**
   * Get a configuration value (generic return type supported).
   */
  get<T = any>(key: string, defaultValue?: T): T
  /**
   * Set a configuration value.
   */
  set(key: string, value: unknown): void
  /**
   * Check whether a key exists.
   */
  has(key: string): boolean
}
//# sourceMappingURL=ConfigManager.d.ts.map
