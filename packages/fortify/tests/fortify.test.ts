import { beforeAll, describe, expect, it, jest, mock } from 'bun:test'

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

let definefortifyConfig: typeof import('../src/config').definefortifyConfig
let defaultFortifyConfig: typeof import('../src/config').defaultFortifyConfig
let FortifyOrbit: typeof import('../src/FortifyOrbit').FortifyOrbit
let registerAuthRoutes: typeof import('../src/routes/auth').registerAuthRoutes
let LoginController: typeof import('../src/controllers/LoginController').LoginController
let RegisterController: typeof import('../src/controllers/RegisterController').RegisterController
let ForgotPasswordController: typeof import('../src/controllers/ForgotPasswordController').ForgotPasswordController
let ResetPasswordController: typeof import('../src/controllers/ResetPasswordController').ResetPasswordController
let VerifyEmailController: typeof import('../src/controllers/VerifyEmailController').VerifyEmailController
let LogoutController: typeof import('../src/controllers/LogoutController').LogoutController
let verified: typeof import('../src/middleware/verified').verified

beforeAll(async () => {
  ;({ definefortifyConfig, defaultFortifyConfig } = await import('../src/config'))
  ;({ FortifyOrbit } = await import('../src/FortifyOrbit'))
  ;({ registerAuthRoutes } = await import('../src/routes/auth'))
  ;({ LoginController } = await import('../src/controllers/LoginController'))
  ;({ RegisterController } = await import('../src/controllers/RegisterController'))
  ;({ ForgotPasswordController } = await import('../src/controllers/ForgotPasswordController'))
  ;({ ResetPasswordController } = await import('../src/controllers/ResetPasswordController'))
  ;({ VerifyEmailController } = await import('../src/controllers/VerifyEmailController'))
  ;({ LogoutController } = await import('../src/controllers/LogoutController'))
  ;({ verified } = await import('../src/middleware/verified'))
})

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

const baseConfig = () =>
  definefortifyConfig({
    userModel: () => MockUser as any,
    features: { registration: true, resetPasswords: true, emailVerification: true },
    jsonMode: true,
  })

describe('Fortify config', () => {
  it('merges defaults correctly', () => {
    const config = definefortifyConfig({
      userModel: () => MockUser as any,
      features: { registration: false },
      redirects: { login: '/home' },
      jsonMode: true,
    })

    expect(config.features.registration).toBe(false)
    expect(config.features.resetPasswords).toBe(true)
    expect(config.redirects.login).toBe('/home')
    expect(config.redirects.logout).toBe(defaultFortifyConfig.redirects?.logout)
  })
})

describe('FortifyOrbit', () => {
  it('registers routes and stores config in container', async () => {
    const router = { get: jest.fn(), post: jest.fn() }
    const container = { singleton: jest.fn() }
    const core = {
      router,
      container,
      logger: { info: jest.fn() },
    }

    const orbit = new FortifyOrbit(baseConfig())
    await orbit.install(core as any)

    expect(container.singleton).toHaveBeenCalledWith('fortify.config', expect.any(Function))
    expect(router.get).toHaveBeenCalled()
  })
})

describe('registerAuthRoutes', () => {
  it('registers routes based on feature flags and prefix', () => {
    const router = { get: jest.fn(), post: jest.fn() }
    const config = baseConfig()
    config.prefix = '/auth'

    registerAuthRoutes(router as any, config)

    expect(router.get).toHaveBeenCalledWith('/auth/login', expect.any(Function))
    expect(router.get).toHaveBeenCalledWith('/auth/register', expect.any(Function))
    expect(router.get).toHaveBeenCalledWith('/auth/forgot-password', expect.any(Function))
    expect(router.get).toHaveBeenCalledWith('/auth/verify-email', expect.any(Function))
  })

  it('skips disabled feature routes', () => {
    const router = { get: jest.fn(), post: jest.fn() }
    const config = baseConfig()
    config.features.registration = false
    config.features.resetPasswords = false
    config.features.emailVerification = false

    registerAuthRoutes(router as any, config)

    const registered = router.get.mock.calls.map((call) => call[0])
    expect(registered).toContain('/login')
    expect(registered).not.toContain('/register')
    expect(registered).not.toContain('/forgot-password')
    expect(registered).not.toContain('/verify-email')
  })
})

describe('LoginController', () => {
  it('redirects when authenticated', async () => {
    const controller = new LoginController(baseConfig())
    const auth = { check: async () => true }
    const response = await controller.show(makeContext({ auth }) as any)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/dashboard')
  })

  it('returns json view in jsonMode', async () => {
    const controller = new LoginController(baseConfig())
    const response = await controller.show(makeContext({}) as any)
    const data = await response.json()
    expect(data).toEqual({ view: 'login' })
  })

  it('returns html in html mode', async () => {
    const config = baseConfig()
    config.jsonMode = false
    const controller = new LoginController(config)
    const response = await controller.show(makeContext({}) as any)
    const html = await response.text()
    expect(html).toContain('<form')
  })

  it('handles login attempts', async () => {
    const controller = new LoginController(baseConfig())
    const auth = {
      attempt: async () => true,
      user: async () => ({ id: 1 }),
    }

    const response = await controller.store(
      makeContext({ auth, body: { email: 'a@b.com', password: 'pw' } }) as any
    )
    const data = await response.json()
    expect(data.message).toBe('Login successful')
  })
})

describe('RegisterController', () => {
  it('rejects invalid payloads', async () => {
    const controller = new RegisterController(baseConfig())
    const auth = { login: async () => {} }

    const response = await controller.store(makeContext({ auth, body: {} }) as any)
    expect(response.status).toBe(422)
  })

  it('creates users when valid', async () => {
    MockUser.reset()
    const controller = new RegisterController(baseConfig())
    const auth = { login: async () => {} }

    const response = await controller.store(
      makeContext({
        auth,
        body: {
          name: 'Test',
          email: 'test@example.com',
          password: 'pw',
          password_confirmation: 'pw',
        },
      }) as any
    )

    expect(response.status).toBe(201)
  })

  it('renders html when jsonMode is false', async () => {
    const config = baseConfig()
    config.jsonMode = false
    const controller = new RegisterController(config)
    const response = await controller.show(makeContext({}) as any)
    const html = await response.text()
    expect(html).toContain('<form')
  })
})

describe('ForgotPasswordController', () => {
  it('validates email and returns message', async () => {
    const controller = new ForgotPasswordController(baseConfig())
    const bad = await controller.store(makeContext({ body: {} }) as any)
    expect(bad.status).toBe(422)

    const ok = await controller.store(makeContext({ body: { email: 'test@example.com' } }) as any)
    const data = await ok.json()
    expect(data.message).toContain('reset link')
  })

  it('renders html when jsonMode is false', async () => {
    const config = baseConfig()
    config.jsonMode = false
    const controller = new ForgotPasswordController(config)
    const response = await controller.show(makeContext({}) as any)
    const html = await response.text()
    expect(html).toContain('Forgot Password')
  })
})

describe('ResetPasswordController', () => {
  it('handles invalid reset requests', async () => {
    const controller = new ResetPasswordController(baseConfig())
    const response = await controller.store(makeContext({ body: {} }) as any)
    expect(response.status).toBe(422)
  })

  it('resets password when token and user are valid', async () => {
    MockUser.reset()
    const user = await MockUser.create({ email: 'test@example.com', password: 'old' })
    PasswordBroker.verifyResult = true

    const controller = new ResetPasswordController(baseConfig())
    const response = await controller.store(
      makeContext({
        body: {
          token: 'token-test@example.com',
          email: 'test@example.com',
          password: 'new',
          password_confirmation: 'new',
        },
      }) as any
    )

    expect(response.status).toBe(200)
    const updated = await MockUser.find(user.id)
    expect(updated?.password).toBe('hashed:new')
  })

  it('rejects invalid tokens', async () => {
    PasswordBroker.verifyResult = false
    const controller = new ResetPasswordController(baseConfig())
    const response = await controller.store(
      makeContext({
        body: {
          token: 'bad',
          email: 'test@example.com',
          password: 'new',
          password_confirmation: 'new',
        },
      }) as any
    )
    expect(response.status).toBe(422)
    PasswordBroker.verifyResult = true
  })

  it('renders html reset form', async () => {
    const config = baseConfig()
    config.jsonMode = false
    const controller = new ResetPasswordController(config)
    const response = await controller.show(
      makeContext({ params: { token: 'token' }, query: { email: 'test@example.com' } }) as any
    )
    const html = await response.text()
    expect(html).toContain('Reset Password')
  })
})

describe('VerifyEmailController', () => {
  it('shows verify view in json mode', async () => {
    const controller = new VerifyEmailController(baseConfig())
    const auth = { check: async () => true, user: async () => ({ email_verified_at: null }) }
    const response = await controller.show(makeContext({ auth }) as any)
    const data = await response.json()
    expect(data.view).toBe('verify-email')
  })

  it('verifies email with valid token', async () => {
    MockUser.reset()
    const user = await MockUser.create({ email: 'test@example.com' })
    EmailVerificationService.verifyPayload = { id: user.id }

    const controller = new VerifyEmailController(baseConfig())
    const response = await controller.verify(
      makeContext({ params: { id: user.id, hash: 'token' } }) as any
    )

    expect(response.status).toBe(200)
  })

  it('sends verification email when unverified', async () => {
    const controller = new VerifyEmailController(baseConfig())
    const auth = {
      check: async () => true,
      user: async () => ({ id: '1', email: 'test@example.com', email_verified_at: null }),
    }

    const response = await controller.send(makeContext({ auth }) as any)
    const data = await response.json()
    expect(data.message).toBe('Verification email sent')
  })

  it('renders html when jsonMode is false', async () => {
    const config = baseConfig()
    config.jsonMode = false
    const controller = new VerifyEmailController(config)
    const auth = { check: async () => true, user: async () => ({ email_verified_at: null }) }
    const response = await controller.show(makeContext({ auth }) as any)
    const html = await response.text()
    expect(html).toContain('Verify Your Email')
  })

  it('rejects invalid verification link', async () => {
    const controller = new VerifyEmailController(baseConfig())
    const response = await controller.verify(makeContext({ params: { id: undefined } }) as any)
    expect(response.status).toBe(422)
  })
})

describe('LogoutController', () => {
  it('logs out and redirects', async () => {
    const controller = new LogoutController(baseConfig())
    const auth = { logout: async () => {} }
    const response = await controller.destroy(makeContext({ auth }) as any)
    const data = await response.json()
    expect(data.message).toBe('Logged out successfully')
  })
})

describe('verified middleware', () => {
  it('requires authentication', async () => {
    const response = await verified(makeContext({}) as any, async () => {})
    expect(response?.status).toBe(500)
  })

  it('redirects unverified users', async () => {
    const auth = { user: async () => ({ email_verified_at: null }) }
    const response = await verified(
      makeContext({ auth, headers: { Accept: 'text/html' } }) as any,
      async () => {}
    )
    expect(response?.status).toBe(302)
  })

  it('calls next for verified users', async () => {
    let called = false
    const auth = { user: async () => ({ email_verified_at: new Date() }) }
    await verified(makeContext({ auth }) as any, async () => {
      called = true
    })
    expect(called).toBe(true)
  })
})
