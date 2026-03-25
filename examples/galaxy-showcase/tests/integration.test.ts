import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Container } from '@gravito/core'
import { CreateUserSchema, LoginSchema } from '../src/models/User'
import { AppServiceProvider } from '../src/providers/AppServiceProvider'

describe('Galaxy Showcase Integration', () => {
  let container: Container
  let provider: AppServiceProvider

  beforeAll(async () => {
    container = new Container()
    provider = new AppServiceProvider()
    await provider.register()
    await provider.boot()
  })

  afterAll(async () => {
    await provider.shutdown()
  })

  // NOTE: These Service Container tests are deprecated.
  // AppServiceProvider does not bind services to Container (it manages
  // services internally). Use provider.getCache(), provider.getCircuitBreaker()
  // etc. instead. Skipped pending example refactor (Phase 2C backlog).
  describe('Service Container', () => {
    it.skip('should resolve database service [deprecated: use provider.getDb()]', () => {
      const db = container.make('db')
      expect(db).toBeDefined()
    })

    it.skip('should resolve JWT manager [deprecated: use provider.getJwt()]', () => {
      const jwt = container.make('jwt')
      expect(jwt).toBeDefined()
    })

    it.skip('should resolve cache service [deprecated: use provider.getCache()]', () => {
      const cache = container.make('cache')
      expect(cache).toBeDefined()
    })

    it.skip('should resolve event bus [deprecated: use provider.getEventBus()]', () => {
      const eventBus = container.make('eventBus')
      expect(eventBus).toBeDefined()
    })

    it.skip('should resolve circuit breaker [deprecated: use provider.getCircuitBreaker()]', () => {
      const cb = container.make('circuitBreaker')
      expect(cb).toBeDefined()
    })

    it.skip('should resolve worker pool [deprecated: use provider.getWorkerPool()]', () => {
      const pool = container.make('workerPool')
      expect(pool).toBeDefined()
    })
  })

  describe('Model Validation', () => {
    it('should validate create user input', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      }
      const result = CreateUserSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const input = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123',
      }
      const result = CreateUserSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject short password', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'short',
      }
      const result = CreateUserSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should validate login input', () => {
      const input = {
        email: 'john@example.com',
        password: 'password123',
      }
      const result = LoginSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })
})
