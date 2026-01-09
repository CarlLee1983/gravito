/**
 * Configuration manager (ConfigManager)
 *
 * Unifies environment variables and application configuration access.
 */
import { getRuntimeEnv } from './runtime'

export class ConfigManager {
  private config: Map<string, unknown> = new Map()

  constructor(initialConfig: Record<string, unknown> = {}) {
    // 1. Load initial config
    for (const [key, value] of Object.entries(initialConfig)) {
      this.config.set(key, value)
    }

    // 2. Auto-load runtime environment variables
    this.loadEnv()
  }

  /**
   * Load all environment variables from the active runtime.
   */
  private loadEnv() {
    const env = getRuntimeEnv()
    for (const key of Object.keys(env)) {
      if (env[key] !== undefined) {
        this.config.set(key, env[key])
      }
    }
  }

  /**
   * Get a configuration value (generic return type supported).
   * Supports dot notation for deep access (e.g. 'app.name').
   */
  get<T = unknown>(key: string, defaultValue?: T): T {
    // Check if key exists directly first
    if (this.config.has(key)) {
      return this.config.get(key) as T
    }

    // Handle dot notation
    if (key.includes('.')) {
      const parts = key.split('.')
      const rootKey = parts[0]
      if (rootKey) {
        let current: any = this.config.get(rootKey)

        if (current !== undefined) {
          for (let i = 1; i < parts.length; i++) {
            const part = parts[i]
            if (part && current && typeof current === 'object' && part in current) {
              current = current[part]
            } else {
              current = undefined
              break
            }
          }

          if (current !== undefined) {
            return current as T
          }
        }
      }
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
