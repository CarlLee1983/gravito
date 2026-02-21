import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { ConfigManager } from '../src/ConfigManager'
import { PlanetCore } from '../src/PlanetCore'

describe('ConfigManager - Zod Schema Validation', () => {
  describe('defineSchema() and validate()', () => {
    it('should validate config against schema', () => {
      const config = new ConfigManager({
        DATABASE_URL: 'postgres://localhost/db',
        PORT: 3000,
      })

      const schema = z.object({
        DATABASE_URL: z.string().url(),
        PORT: z.number(),
      })

      config.defineSchema(schema)
      expect(() => config.validate()).not.toThrow()
    })

    it('should throw error for invalid config', () => {
      const config = new ConfigManager({
        DATABASE_URL: 'not-a-url',
        PORT: 'not-a-number',
      })

      const schema = z.object({
        DATABASE_URL: z.string().url(),
        PORT: z.number(),
      })

      config.defineSchema(schema)
      expect(() => config.validate()).toThrow()
    })

    it('should include field names in error message', () => {
      const config = new ConfigManager({
        DATABASE_URL: 'invalid',
        PORT: 'invalid',
      })

      const schema = z.object({
        DATABASE_URL: z.string().url(),
        PORT: z.number(),
      })

      config.defineSchema(schema)
      try {
        config.validate()
        expect(false).toBe(true) // Should throw
      } catch (error: any) {
        expect(error.message).toContain('Configuration validation failed')
        expect(error.message).toContain('DATABASE_URL')
      }
    })

    it('should handle optional fields', () => {
      const config = new ConfigManager({
        APP_NAME: 'MyApp',
      })

      const schema = z.object({
        APP_NAME: z.string(),
        LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
      })

      config.defineSchema(schema)
      expect(() => config.validate()).not.toThrow()
    })

    it('should support default values', () => {
      const config = new ConfigManager({
        APP_NAME: 'MyApp',
      })

      const schema = z.object({
        APP_NAME: z.string(),
        PORT: z.number().default(3000),
      })

      config.defineSchema(schema)
      expect(() => config.validate()).not.toThrow()
    })

    it('should work with environment variables', () => {
      const config = new ConfigManager()
      // The constructor automatically loads env vars

      const schema = z.object({
        PATH: z.string(), // Usually exists in env
      })

      config.defineSchema(schema)
      expect(() => config.validate()).not.toThrow()
    })

    it('should not throw if schema is not defined', () => {
      const config = new ConfigManager({
        RANDOM_KEY: 'value',
      })

      // No schema defined, validate should do nothing
      expect(() => config.validate()).not.toThrow()
    })
  })

  describe('Integration with PlanetCore.bootstrap()', () => {
    it('should validate config during bootstrap', async () => {
      const schema = z.object({
        DATABASE_URL: z.string().url(),
      })

      const core = new PlanetCore({
        config: {
          DATABASE_URL: 'postgres://localhost/db',
        },
      })

      core.config.defineSchema(schema)

      // Should not throw
      await expect(core.bootstrap()).resolves.toBeUndefined()
    })

    it('should fail bootstrap with invalid config', async () => {
      const core = new PlanetCore({
        config: {
          DATABASE_URL: 'not-a-url',
        },
      })

      const schema = z.object({
        DATABASE_URL: z.string().url(),
      })

      core.config.defineSchema(schema)

      await expect(core.bootstrap()).rejects.toThrow('Configuration validation failed')
    })

    it('should validate before provider registration', async () => {
      let providerRegistered = false

      const { ServiceProvider } = await import('../src/ServiceProvider')

      class TestProvider extends ServiceProvider {
        register() {
          providerRegistered = true
        }
      }

      const core = new PlanetCore({
        config: {
          DATABASE_URL: 'invalid',
        },
      })

      const schema = z.object({
        DATABASE_URL: z.string().url(),
      })

      core.config.defineSchema(schema)
      core.register(new TestProvider())

      try {
        await core.bootstrap()
      } catch {
        // Expected to fail
      }

      // Provider should not have been registered due to validation failure
      expect(providerRegistered).toBe(false)
    })
  })

  describe('Complex schema validation', () => {
    it('should validate nested structures', () => {
      const config = new ConfigManager({
        database: JSON.stringify({
          host: 'localhost',
          port: 5432,
        }),
      })

      const schema = z.object({
        database: z.string().transform((val) => JSON.parse(val)),
      })

      config.defineSchema(schema)
      expect(() => config.validate()).not.toThrow()
    })

    it('should validate multiple required fields', () => {
      const config = new ConfigManager({
        APP_NAME: 'TestApp',
        DATABASE_URL: 'postgres://localhost/db',
        API_KEY: 'secret-key',
        PORT: '3000',
      })

      const schema = z.object({
        APP_NAME: z.string().min(1),
        DATABASE_URL: z.string().url(),
        API_KEY: z.string().min(10),
        PORT: z.string().regex(/^\d+$/),
      })

      config.defineSchema(schema)
      expect(() => config.validate()).not.toThrow()
    })

    it('should fail with clear error messages for missing required fields', () => {
      const config = new ConfigManager({
        APP_NAME: 'TestApp',
        // DATABASE_URL missing
      })

      const schema = z.object({
        APP_NAME: z.string(),
        DATABASE_URL: z.string().url(),
      })

      config.defineSchema(schema)
      try {
        config.validate()
        expect(true).toBe(false) // Should throw
      } catch (error: any) {
        expect(error.message).toContain('Configuration validation failed')
        expect(error.message).toContain('DATABASE_URL')
      }
    })
  })
})
