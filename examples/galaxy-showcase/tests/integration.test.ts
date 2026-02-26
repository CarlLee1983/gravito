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
    await provider.register(container)
    await provider.boot(container)
  })

  afterAll(async () => {
    await provider.shutdown(container)
  })

  describe('Service Container', () => {
    it('should resolve database service', () => {
      const db = container.resolve('db')
      expect(db).toBeDefined()
    })

    it('should resolve JWT manager', () => {
      const jwt = container.resolve('jwt')
      expect(jwt).toBeDefined()
    })

    it('should resolve cache service', () => {
      const cache = container.resolve('cache')
      expect(cache).toBeDefined()
    })

    it('should resolve event bus', () => {
      const eventBus = container.resolve('eventBus')
      expect(eventBus).toBeDefined()
    })

    it('should resolve circuit breaker', () => {
      const cb = container.resolve('circuitBreaker')
      expect(cb).toBeDefined()
    })

    it('should resolve worker pool', () => {
      const pool = container.resolve('workerPool')
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
