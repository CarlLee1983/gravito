/**
 * Configuration manager (ConfigManager)
 *
 * Unifies environment variables and application configuration access.
 */
export class ConfigManager {
  private config: Map<string, unknown> = new Map()

  constructor(initialConfig: Record<string, unknown> = {}) {
    // 1. Load initial config
    for (const [key, value] of Object.entries(initialConfig)) {
      this.config.set(key, value)
    }

    // 2. Auto-load Bun environment variables
    this.loadEnv()
  }

  /**
   * Load all environment variables from `Bun.env`.
   */
  private loadEnv() {
    const env = Bun.env
    for (const key of Object.keys(env)) {
      if (env[key] !== undefined) {
        this.config.set(key, env[key])
      }
    }
  }

  /**
   * Get a configuration value (generic return type supported).
   */
  get<T = unknown>(key: string, defaultValue?: T): T {
    if (this.config.has(key)) {
      return this.config.get(key) as T
    }
    if (defaultValue !== undefined) {
      return defaultValue
    }
    throw new Error(`Config key '${key}' not found`)
  }

  /**
   * Set a configuration value.
   */
  set(key: string, value: unknown): void {
    this.config.set(key, value)
  }

  /**
   * Check whether a key exists.
   */
  has(key: string): boolean {
    return this.config.has(key)
  }
}
