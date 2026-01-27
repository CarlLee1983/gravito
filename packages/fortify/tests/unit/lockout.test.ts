import { beforeEach, describe, expect, it } from 'bun:test'
import type { FortifyConfig } from '../../src/config'
import { LoginController } from '../../src/controllers/LoginController'
import { createMockContext } from '../helpers/mock-context'
import { MockUser } from '../helpers/mock-user'

describe('Account Lockout', () => {
  let config: FortifyConfig
  let controller: LoginController

  beforeEach(() => {
    MockUser.reset()
    config = {
      features: { registration: true, resetPasswords: true },
      redirects: { login: '/dashboard', logout: '/', register: '/dashboard' },
      userModel: () => MockUser as any,
      username: 'email',
      password: 'password',
      jsonMode: true,
      security: {
        lockout: {
          enabled: true,
          threshold: 3,
          duration: 30,
        },
      },
    }
    controller = new LoginController(config)
  })

  describe('when lockout is enabled', () => {
    it('should increment failed_login_attempts on failed login', async () => {
      await MockUser.create({
        email: 'test@example.com',
        password: 'hashed:correct',
        failed_login_attempts: 0,
      })

      const context = createMockContext({
        path: '/login',
        method: 'POST',
        body: { email: 'test@example.com', password: 'wrong' },
        auth: { attempt: async () => false },
      })

      await controller.store(context)

      const updated = await MockUser.query().where('email', 'test@example.com').first()
      expect(updated?.failed_login_attempts).toBe(1)
    })

    it('should lock account after threshold failures', async () => {
      await MockUser.create({
        email: 'test@example.com',
        password: 'hashed:correct',
        failed_login_attempts: 2,
      })

      const context = createMockContext({
        path: '/login',
        method: 'POST',
        body: { email: 'test@example.com', password: 'wrong' },
        auth: { attempt: async () => false },
      })

      await controller.store(context)

      const locked = await MockUser.query().where('email', 'test@example.com').first()
      expect(locked?.failed_login_attempts).toBe(3)
      expect(locked?.locked_until).not.toBeNull()
    })

    it('should reject login when account is locked', async () => {
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000)
      await MockUser.create({
        email: 'test@example.com',
        password: 'hashed:correct',
        failed_login_attempts: 3,
        locked_until: lockedUntil,
      })

      const context = createMockContext({
        path: '/login',
        method: 'POST',
        body: { email: 'test@example.com', password: 'correct' },
        auth: { attempt: async () => true },
      })

      const response = await controller.store(context)
      expect(response.status).toBe(423)

      const body = await response.json()
      expect(body.error).toBe('Account locked')
      expect(body.retryAfter).toBeGreaterThan(0)
    })

    it('should unlock account after lockout duration expires', async () => {
      const expiredLock = new Date(Date.now() - 1000)
      await MockUser.create({
        email: 'test@example.com',
        password: 'hashed:correct',
        failed_login_attempts: 3,
        locked_until: expiredLock,
      })

      const context = createMockContext({
        path: '/login',
        method: 'POST',
        body: { email: 'test@example.com', password: 'correct' },
        auth: { attempt: async () => true },
      })

      const response = await controller.store(context)
      expect(response.status).toBe(200)

      const unlocked = await MockUser.query().where('email', 'test@example.com').first()
      expect(unlocked?.locked_until).toBeNull()
      expect(unlocked?.failed_login_attempts).toBe(0)
    })

    it('should reset failed_login_attempts on successful login', async () => {
      await MockUser.create({
        email: 'test@example.com',
        password: 'hashed:correct',
        failed_login_attempts: 2,
      })

      const context = createMockContext({
        path: '/login',
        method: 'POST',
        body: { email: 'test@example.com', password: 'correct' },
        auth: { attempt: async () => true },
      })

      await controller.store(context)

      const reset = await MockUser.query().where('email', 'test@example.com').first()
      expect(reset?.failed_login_attempts).toBe(0)
    })
  })

  describe('when lockout is disabled', () => {
    beforeEach(() => {
      config.security = {
        lockout: {
          enabled: false,
          threshold: 3,
          duration: 30,
        },
      }
      controller = new LoginController(config)
    })

    it('should not increment failed_login_attempts', async () => {
      await MockUser.create({
        email: 'test@example.com',
        password: 'hashed:correct',
        failed_login_attempts: 0,
      })

      const context = createMockContext({
        path: '/login',
        method: 'POST',
        body: { email: 'test@example.com', password: 'wrong' },
        auth: { attempt: async () => false },
      })

      await controller.store(context)

      const user = await MockUser.query().where('email', 'test@example.com').first()
      expect(user?.failed_login_attempts).toBe(0)
    })
  })

  describe('non-JSON mode', () => {
    beforeEach(() => {
      config.jsonMode = false
      controller = new LoginController(config)
    })

    it('should redirect on locked account', async () => {
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000)
      await MockUser.create({
        email: 'test@example.com',
        password: 'hashed:correct',
        locked_until: lockedUntil,
      })

      const context = createMockContext({
        path: '/login',
        method: 'POST',
        body: { email: 'test@example.com', password: 'correct' },
        auth: { attempt: async () => true },
      })

      const response = await controller.store(context)
      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toContain('account_locked')
    })
  })
})
