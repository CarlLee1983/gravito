import type { GravitoContext } from '@gravito/core'
import type { AuthManager } from '@gravito/sentinel'
import type { FortifyConfig } from '../config'
import { ensureCsrfToken } from '../csrf'
import type { AuthLogger } from '../services/AuthLogger'
import type { RateLimiter } from '../services/RateLimiter'
import type { ViewService } from '../types'
import { getClientInfo } from '../utils/request'

export class LoginController {
  constructor(
    private config: FortifyConfig,
    private rateLimiter?: RateLimiter,
    private authLogger?: AuthLogger
  ) {}

  async show(c: GravitoContext): Promise<Response> {
    const auth = c.get('auth') as AuthManager
    if (auth && (await auth.check())) {
      return c.redirect(this.config.redirects.login ?? '/dashboard')
    }

    if (this.config.jsonMode) {
      return c.json({ view: 'login' })
    }

    const csrfToken = ensureCsrfToken(c, this.config)

    const view = c.get('view') as ViewService | undefined
    if (view?.render && this.config.views?.login) {
      return c.html(view.render(this.config.views.login, { csrfToken }))
    }

    return c.html(this.defaultLoginHtml(csrfToken ?? undefined))
  }

  async store(c: GravitoContext): Promise<Response> {
    const auth = c.get('auth') as AuthManager
    if (!auth) {
      return c.json({ error: 'Authentication service not available' }, 500)
    }

    const body = await c.req.json<{
      email?: string
      password?: string
      remember?: boolean
    }>()

    const username = this.config.username ?? 'email'
    const passwordField = this.config.password ?? 'password'

    const credentials = {
      [username]: body.email ?? body[username as keyof typeof body],
      [passwordField]: body.password ?? body[passwordField as keyof typeof body],
    }

    const identifier = credentials[username] as string
    const remember = body.remember ?? false
    const clientInfo = getClientInfo(c)

    if (this.rateLimiter && identifier) {
      const rateLimitResult = await this.rateLimiter.checkAttempt(identifier, 'login')

      if (!rateLimitResult.allowed) {
        if (this.config.jsonMode) {
          return c.json(
            {
              error:
                rateLimitResult.reason === 'account_locked'
                  ? 'Account locked'
                  : 'Too many attempts',
              retryAfter: rateLimitResult.retryAfter,
            },
            429
          )
        }
        return c.redirect('/login?error=too_many_attempts')
      }
    }

    const UserModel = this.config.userModel() as any
    const user = await UserModel.query().where(username, identifier).first()

    if (user) {
      const lockoutConfig = this.config.security?.lockout
      const isLockoutEnabled = lockoutConfig?.enabled ?? true

      if (isLockoutEnabled && user.locked_until) {
        const lockedUntil = new Date(user.locked_until)
        if (lockedUntil > new Date()) {
          const retryAfter = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)

          await this.authLogger?.log({
            type: 'account_locked',
            userId: user.id,
            email: identifier,
            success: false,
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            metadata: { lockedUntil: lockedUntil.toISOString(), retryAfter },
          })

          if (this.config.jsonMode) {
            return c.json({ error: 'Account locked', retryAfter }, 423)
          }
          return c.redirect('/login?error=account_locked')
        } else {
          await user.update({ locked_until: null, failed_login_attempts: 0 })
        }
      }
    }

    try {
      await this.authLogger?.log({
        type: 'login_attempt',
        userId: user?.id,
        email: identifier,
        success: false,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      })

      const success = await auth.attempt(credentials, remember)

      if (!success) {
        if (user) {
          const lockoutConfig = this.config.security?.lockout
          const isLockoutEnabled = lockoutConfig?.enabled ?? true
          const lockoutThreshold = lockoutConfig?.threshold ?? 5
          const lockoutDuration = lockoutConfig?.duration ?? 30

          if (isLockoutEnabled) {
            const newAttempts = (user.failed_login_attempts ?? 0) + 1

            if (newAttempts >= lockoutThreshold) {
              const lockedUntil = new Date(Date.now() + lockoutDuration * 60 * 1000)
              await user.update({
                failed_login_attempts: newAttempts,
                locked_until: lockedUntil,
              })
            } else {
              await user.update({ failed_login_attempts: newAttempts })
            }
          }
        }

        await this.authLogger?.log({
          type: 'login_failure',
          userId: user?.id,
          email: identifier,
          success: false,
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          metadata: { reason: 'invalid_credentials' },
        })

        if (this.config.jsonMode) {
          return c.json({ error: 'Invalid credentials' }, 401)
        }
        return c.redirect('/login?error=invalid_credentials')
      }

      if (this.config.features.twoFactorAuthentication) {
        const currentUser = (await auth.user()) as any

        if (currentUser?.two_factor_secret && currentUser.two_factor_confirmed_at) {
          await auth.logout()

          const session = c.get('session') as any
          if (session) {
            await session.set('two_factor_user_id', currentUser.id)
            await session.set('two_factor_remember', remember)
          }

          if (this.config.jsonMode) {
            return c.json({
              two_factor: true,
              redirect: '/two-factor/challenge',
            })
          }
          return c.redirect('/two-factor/challenge')
        }
      }

      if (user && user.failed_login_attempts > 0) {
        await user.update({ failed_login_attempts: 0, locked_until: null })
      }

      if (this.rateLimiter && identifier) {
        await this.rateLimiter.recordSuccess(identifier, 'login')
      }

      const shouldRegenerateSession = this.config.security?.session?.regenerateOnLogin ?? true
      if (shouldRegenerateSession) {
        const session = c.get('session') as any
        if (session?.regenerate) {
          await session.regenerate()
        }
      }

      await this.authLogger?.log({
        type: 'login_success',
        userId: user?.id,
        email: identifier,
        success: true,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      })

      if (this.config.jsonMode) {
        const currentUser = await auth.user()
        return c.json({
          message: 'Login successful',
          user: currentUser,
          redirect: this.config.redirects.login ?? '/dashboard',
        })
      }

      return c.redirect(this.config.redirects.login ?? '/dashboard')
    } catch (error) {
      console.error('[Fortify] Login error:', error)

      await this.authLogger?.log({
        type: 'login_failure',
        userId: user?.id,
        email: identifier,
        success: false,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        metadata: { reason: 'server_error', error: String(error) },
      })

      if (this.config.jsonMode) {
        return c.json({ error: 'Authentication failed' }, 500)
      }
      return c.redirect('/login?error=server_error')
    }
  }

  private defaultLoginHtml(csrfToken?: string): string {
    const csrfField = csrfToken ? `<input type="hidden" name="_token" value="${csrfToken}">` : ''
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Gravito</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { width: 100%; max-width: 400px; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 1.5rem; text-align: center; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #888; }
    input { width: 100%; padding: 0.75rem 1rem; background: #1a1a1a; border: 1px solid #333; border-radius: 0.5rem; color: #fff; font-size: 1rem; }
    input:focus { outline: none; border-color: #14f195; }
    button { width: 100%; padding: 0.75rem 1rem; background: #14f195; border: none; border-radius: 0.5rem; color: #000; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 1rem; }
    button:hover { background: #0fd17d; }
    .links { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; }
    .links a { color: #14f195; text-decoration: none; }
    .error { background: #ff4757; color: #fff; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1rem; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Sign In</h1>
    <form method="POST" action="/login">
      ${csrfField}
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit">Sign In</button>
    </form>
    <div class="links">
      <a href="/forgot-password">Forgot password?</a> · <a href="/register">Create account</a>
    </div>
  </div>
</body>
</html>`
  }
}
