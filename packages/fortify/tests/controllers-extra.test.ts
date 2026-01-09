import { beforeEach, describe, expect, test } from 'bun:test'

class HashManager {
  async make(value: string): Promise<string> {
    return `hashed:${value}`
  }
}

class InMemoryPasswordResetTokenRepository {}

class PasswordBroker {
  static verifyResult = true
  async createToken(email: string): Promise<string> {
    return `token-${email}`
  }
  async verifyToken(_email: string, _token: string): Promise<boolean> {
    return PasswordBroker.verifyResult
  }
  async invalidate(_email: string): Promise<void> {}
}

class EmailVerificationService {
  static verifyPayload: { id: string } | null = { id: '1' }
  createToken(payload: { id: string; email: string }): string {
    return `token-${payload.id}`
  }
  verifyToken(_hash: string): { id: string } | null {
    return EmailVerificationService.verifyPayload
  }
}

import { mock } from 'bun:test'

mock.module('@gravito/sentinel', () => ({
  HashManager,
  PasswordBroker,
  InMemoryPasswordResetTokenRepository,
  EmailVerificationService,
}))

mock.module('@gravito/core', () => ({
  csrfProtection: () => async (_c: any, next?: () => Promise<unknown>) =>
    next ? next() : undefined,
  getCsrfToken: () => 'csrf-token',
}))

const { definefortifyConfig } = await import('../src/config')
const { LoginController } = await import('../src/controllers/LoginController')
const { RegisterController } = await import('../src/controllers/RegisterController')
const { ForgotPasswordController } = await import('../src/controllers/ForgotPasswordController')
const { ResetPasswordController } = await import('../src/controllers/ResetPasswordController')
const { VerifyEmailController } = await import('../src/controllers/VerifyEmailController')
const { LogoutController } = await import('../src/controllers/LogoutController')

class MockUser {
  static records: Map<string, MockUser> = new Map()
  static nextId = 1

  id: string
  name: string
  email: string
  password: string
  email_verified_at: Date | null = null

  constructor(data: Partial<MockUser>) {
    this.id = data.id ?? String(MockUser.nextId++)
    this.name = data.name ?? ''
    this.email = data.email ?? ''
    this.password = data.password ?? ''
    this.email_verified_at = data.email_verified_at ?? null
  }

  static async create(data: Partial<MockUser>): Promise<MockUser> {
    const user = new MockUser(data)
    MockUser.records.set(user.id, user)
    return user
  }

  static async find(id: string): Promise<MockUser | null> {
    return MockUser.records.get(id) ?? null
  }

  static query() {
    return {
      where: (_field: string, value: string) => ({
        first: async () => {
          for (const user of MockUser.records.values()) {
            if (user.email === value) {
              return user
            }
          }
          return null
        },
      }),
    }
  }

  async save(): Promise<void> {
    MockUser.records.set(this.id, this)
  }

  static reset(): void {
    MockUser.records.clear()
    MockUser.nextId = 1
  }
}

const makeContext = (options: {
  auth?: any
  view?: any
  body?: any
  params?: Record<string, string | undefined>
  query?: Record<string, string | undefined>
  headers?: Record<string, string | undefined>
}) => {
  const { auth, view, body = {}, params = {}, query = {}, headers = {} } = options
  return {
    get: (key: string) => {
      if (key === 'auth') {
        return auth
      }
      if (key === 'view') {
        return view
      }
      return undefined
    },
    req: {
      json: async () => body,
      param: (key: string) => params[key],
      query: (key: string) => query[key],
      header: (key: string) => headers[key],
    },
    json: (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    html: (html: string) => new Response(html, { headers: { 'content-type': 'text/html' } }),
    redirect: (location: string) =>
      new Response(null, { status: 302, headers: { Location: location } }),
  }
}

const baseConfig = (jsonMode = true) =>
  definefortifyConfig({
    userModel: () => MockUser as any,
    features: { registration: true, resetPasswords: true, emailVerification: true },
    jsonMode,
  })

const makeAuth = (options: { ok?: boolean; user?: any; throwAttempt?: boolean }) => {
  const { ok = true, user = null, throwAttempt = false } = options
  return {
    check: async () => ok,
    attempt: async () => {
      if (throwAttempt) {
        throw new Error('attempt failed')
      }
      return ok
    },
    user: async () => user,
    login: async () => {},
    logout: async () => {
      if (!ok) {
        throw new Error('logout failed')
      }
    },
  }
}

beforeEach(() => {
  MockUser.reset()
  PasswordBroker.verifyResult = true
  EmailVerificationService.verifyPayload = { id: '1' }
})

describe('Fortify controllers', () => {
  test('LoginController show handles redirect, json, and html', async () => {
    const login = new LoginController(baseConfig())
    const loginHtml = new LoginController(baseConfig(false))

    const redirectRes = await login.show(makeContext({ auth: makeAuth({ ok: true }) }) as any)
    expect(redirectRes.status).toBe(302)

    const jsonRes = await login.show(makeContext({ auth: makeAuth({ ok: false }) }) as any)
    expect(await jsonRes.json()).toEqual({ view: 'login' })

    const htmlRes = await loginHtml.show(makeContext({ auth: makeAuth({ ok: false }) }) as any)
    expect(await htmlRes.text()).toContain('Login - Gravito')
  })

  test('LoginController store covers error and success paths', async () => {
    const login = new LoginController(baseConfig())

    const noAuth = await login.store(makeContext({}) as any)
    expect(noAuth.status).toBe(500)

    const invalid = await login.store(
      makeContext({ auth: makeAuth({ ok: false }), body: { email: 'a', password: 'b' } }) as any
    )
    expect(invalid.status).toBe(401)

    const user = await MockUser.create({ email: 'a', password: 'b' })
    const success = await login.store(
      makeContext({
        auth: makeAuth({ ok: true, user }),
        body: { email: 'a', password: 'b' },
      }) as any
    )
    expect((await success.json()).message).toBe('Login successful')

    const errorRes = await login.store(
      makeContext({ auth: makeAuth({ ok: true, throwAttempt: true }) }) as any
    )
    expect(errorRes.status).toBe(500)
  })

  test('RegisterController show and store', async () => {
    const register = new RegisterController(baseConfig())
    const registerHtml = new RegisterController(baseConfig(false))

    const redirectRes = await register.show(makeContext({ auth: makeAuth({ ok: true }) }) as any)
    expect(redirectRes.status).toBe(302)

    const jsonRes = await register.show(makeContext({ auth: makeAuth({ ok: false }) }) as any)
    expect(await jsonRes.json()).toEqual({ view: 'register' })

    const htmlRes = await registerHtml.show(makeContext({ auth: makeAuth({ ok: false }) }) as any)
    expect(await htmlRes.text()).toContain('Register - Gravito')

    const invalid = await register.store(
      makeContext({ auth: makeAuth({ ok: true }), body: {} }) as any
    )
    expect(invalid.status).toBe(422)

    const mismatch = await register.store(
      makeContext({
        auth: makeAuth({ ok: true }),
        body: { email: 'a', password: '1', password_confirmation: '2' },
      }) as any
    )
    expect(mismatch.status).toBe(422)

    await MockUser.create({ email: 'taken', password: 'x' })
    const exists = await register.store(
      makeContext({
        auth: makeAuth({ ok: true }),
        body: { email: 'taken', password: '1', password_confirmation: '1' },
      }) as any
    )
    expect(exists.status).toBe(422)

    const created = await register.store(
      makeContext({
        auth: makeAuth({ ok: true }),
        body: { email: 'new', password: '1', password_confirmation: '1', name: 'New' },
      }) as any
    )
    expect(created.status).toBe(201)
  })

  test('ForgotPasswordController show and store', async () => {
    const forgot = new ForgotPasswordController(baseConfig())
    const forgotHtml = new ForgotPasswordController(baseConfig(false))

    const jsonRes = await forgot.show(makeContext({}) as any)
    expect(await jsonRes.json()).toEqual({ view: 'forgot-password' })

    const htmlRes = await forgotHtml.show(makeContext({}) as any)
    expect(await htmlRes.text()).toContain('Forgot Password')

    const missing = await forgot.store(makeContext({ body: {} }) as any)
    expect(missing.status).toBe(422)

    const sent = await forgot.store(makeContext({ body: { email: 'a@b.com' } }) as any)
    expect((await sent.json()).message).toContain('If the email exists')
  })

  test('ResetPasswordController show and store', async () => {
    const reset = new ResetPasswordController(baseConfig())
    const resetHtml = new ResetPasswordController(baseConfig(false))

    const jsonRes = await reset.show(
      makeContext({ params: { token: 't' }, query: { email: 'a' } }) as any
    )
    expect((await jsonRes.json()).token).toBe('t')

    const htmlRes = await resetHtml.show(
      makeContext({ params: { token: 't' }, query: { email: 'a' } }) as any
    )
    expect(await htmlRes.text()).toContain('Reset Password - Gravito')

    const missing = await reset.store(makeContext({ body: {} }) as any)
    expect(missing.status).toBe(422)

    const mismatch = await reset.store(
      makeContext({
        body: { token: 't', email: 'a', password: '1', password_confirmation: '2' },
      }) as any
    )
    expect(mismatch.status).toBe(422)

    PasswordBroker.verifyResult = false
    const invalidToken = await reset.store(
      makeContext({
        body: { token: 't', email: 'a', password: '1', password_confirmation: '1' },
      }) as any
    )
    expect(invalidToken.status).toBe(422)

    PasswordBroker.verifyResult = true
    const missingUser = await reset.store(
      makeContext({
        body: { token: 't', email: 'missing', password: '1', password_confirmation: '1' },
      }) as any
    )
    expect(missingUser.status).toBe(404)

    await MockUser.create({ email: 'a', password: 'old' })
    const success = await reset.store(
      makeContext({
        body: { token: 't', email: 'a', password: '1', password_confirmation: '1' },
      }) as any
    )
    expect((await success.json()).message).toBe('Password reset successful')
  })

  test('VerifyEmailController show, verify, and send', async () => {
    const verify = new VerifyEmailController(baseConfig())
    const verifyHtml = new VerifyEmailController(baseConfig(false))

    const redirect = await verify.show(makeContext({ auth: makeAuth({ ok: false }) }) as any)
    expect(redirect.status).toBe(302)

    const viewRes = await verify.show(
      makeContext({ auth: makeAuth({ ok: true, user: { email_verified_at: null } }) }) as any
    )
    expect((await viewRes.json()).view).toBe('verify-email')

    const htmlRes = await verifyHtml.show(
      makeContext({ auth: makeAuth({ ok: true, user: { email_verified_at: null } }) }) as any
    )
    expect(await htmlRes.text()).toContain('Verify Email - Gravito')

    const invalid = await verify.verify(makeContext({ params: {} }) as any)
    expect(invalid.status).toBe(422)

    EmailVerificationService.verifyPayload = null
    const invalidToken = await verify.verify(makeContext({ params: { id: '1', hash: 'h' } }) as any)
    expect(invalidToken.status).toBe(422)

    EmailVerificationService.verifyPayload = { id: '1' }
    const missingUser = await verify.verify(makeContext({ params: { id: '1', hash: 'h' } }) as any)
    expect(missingUser.status).toBe(404)

    const user = await MockUser.create({ email: 'a', password: 'x' })
    const success = await verify.verify(makeContext({ params: { id: user.id, hash: 'h' } }) as any)
    expect((await success.json()).message).toBe('Email verified successfully')

    const unauthSend = await verify.send(makeContext({ auth: makeAuth({ ok: false }) }) as any)
    expect(unauthSend.status).toBe(401)

    const already = await verify.send(
      makeContext({ auth: makeAuth({ ok: true, user: { email_verified_at: new Date() } }) }) as any
    )
    expect((await already.json()).message).toBe('Email already verified')

    const send = await verify.send(
      makeContext({
        auth: makeAuth({ ok: true, user: { id: '1', email: 'a', email_verified_at: null } }),
      }) as any
    )
    expect((await send.json()).message).toBe('Verification email sent')
  })

  test('LogoutController returns json response', async () => {
    const logout = new LogoutController(baseConfig())
    const res = await logout.destroy(makeContext({ auth: makeAuth({ ok: true }) }) as any)
    expect((await res.json()).message).toBe('Logged out successfully')

    const resError = await logout.destroy(makeContext({ auth: makeAuth({ ok: false }) }) as any)
    expect((await resError.json()).message).toBe('Logged out successfully')
  })
})
