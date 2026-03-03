/**
 * Configuration manager (ConfigManager)
 *
 * Unifies environment variables and application configuration access.
 */
import type { ZodSchema } from 'zod'
/**
 * ConfigManager - Central configuration store.
 * Supports loading from environment variables and initial objects.
 * @public
 */
export declare class ConfigManager {
  private config
  private schema
  constructor(initialConfig?: Record<string, unknown>)
  /**
   * Load all environment variables from the active runtime.
   */
  private loadEnv
  /**
   * Get a configuration value (generic return type supported).
   * Supports dot notation for deep access (e.g. 'app.name').
   */
  get<T = unknown>(key: string, defaultValue?: T): T
  /**
   * Set a configuration value.
   */
  set(key: string, value: unknown): void
  /**
   * Check whether a key exists.
   */
  has(key: string): boolean
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
  defineSchema(schema: ZodSchema): void
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
  validate(): void
}
