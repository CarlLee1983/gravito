/**
 * Configuration manager (ConfigManager)
 *
 * Unifies environment variables and application configuration access.
 */
import type { ZodSchema } from 'zod'
import { getRuntimeEnv } from './runtime'

/**
 * ConfigManager - Central configuration store.
 * Supports loading from environment variables and initial objects.
 * @public
 */
export class ConfigManager {
  private config: Map<string, unknown> = new Map()
  private schema: ZodSchema | null = null

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
        let current: unknown = this.config.get(rootKey)

        if (current !== undefined) {
          for (let i = 1; i < parts.length; i++) {
            const part = parts[i]
            if (part && current && typeof current === 'object' && part in current) {
              current = (current as Record<string, unknown>)[part]
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

  /**
   * Define a Zod schema for configuration validation.
   *
   * @param schema - Zod schema for validation
   *
   * @example
   * ```typescript
   * config.defineSchema(z.object({
   *   DATABASE_URL: z.string().url(),
   *   PORT: z.number().default(3000),
   * }))
   * ```
   */
  defineSchema(schema: ZodSchema): void {
    this.schema = schema
  }

  /**
   * Validate configuration against the defined schema.
   *
   * Should be called during bootstrap to catch configuration errors early.
   *
   * @throws Error if validation fails with details about missing/invalid fields
   *
   * @example
   * ```typescript
   * try {
   *   config.validate()
   * } catch (error) {
   *   console.error('Config validation failed:', error.message)
   *   process.exit(1)
   * }
   * ```
   */
  validate(): void {
    if (!this.schema) {
      return
    }

    const configObj = Object.fromEntries(this.config)
    const result = this.schema.safeParse(configObj)

    if (!result.success) {
      const errors = result.error.issues
        .map((issue) => {
          const path = Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path)
          return `${path} - ${issue.message}`
        })
        .join('; ')
      throw new Error(`Configuration validation failed: ${errors}`)
    }
  }
}
