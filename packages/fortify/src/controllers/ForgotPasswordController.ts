import type { GravitoContext } from '@gravito/core'
import {
  HashManager,
  InMemoryPasswordResetTokenRepository,
  PasswordBroker,
} from '@gravito/sentinel'
import type { OrbitSignal } from '@gravito/signal'
import type { FortifyConfig } from '../config'
import { ensureCsrfToken } from '../csrf'
import { ResetPasswordMail } from '../mail'
import type { RateLimiter } from '../services/RateLimiter'
import type { ViewService } from '../types'

/**
 * ForgotPasswordController handles password reset requests
 */
export class ForgotPasswordController {
  private broker: PasswordBroker

  constructor(
    private config: FortifyConfig,
    private rateLimiter?: RateLimiter
  ) {
    // In production, use a database-backed repository
    this.broker = new PasswordBroker(new InMemoryPasswordResetTokenRepository(), new HashManager())
  }

  /**
   * Show forgot password form
   * GET /forgot-password
   */
  async show(c: GravitoContext): Promise<Response> {
    if (this.config.jsonMode) {
      return c.json({ view: 'forgot-password' })
    }

    const csrfToken = ensureCsrfToken(c, this.config)

    const view = c.get('view') as ViewService | undefined
    if (view?.render && this.config.views?.forgotPassword) {
      return c.html(view.render(this.config.views.forgotPassword, { csrfToken }))
    }

    return c.html(this.defaultForgotPasswordHtml(csrfToken ?? undefined))
  }

  /**
   * Handle password reset request
   * POST /forgot-password
   */
  async store(c: GravitoContext): Promise<Response> {
    const body = await c.req.json<{ email?: string }>()

    if (!body.email) {
      if (this.config.jsonMode) {
        return c.json({ error: 'Email is required' }, 422)
      }
      return c.redirect('/forgot-password?error=validation')
    }

    // Check rate limit if available
    if (this.rateLimiter) {
      const clientIp = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'
      const rateLimitKey = `password-reset:${clientIp}`

      const rateLimitResult = await this.rateLimiter.checkAttempt(rateLimitKey)
      if (!rateLimitResult.allowed) {
        if (this.config.jsonMode) {
          return c.json(
            {
              error: 'Too many password reset attempts. Please try again later.',
              retryAfter: rateLimitResult.retryAfter,
            },
            429
          )
        }
        return c.redirect('/forgot-password?error=rate_limit')
      }
    }

    try {
      // Get User model from config
      const UserModel = this.config.userModel()

      // Check if user exists
      const user = await (UserModel as any).query().where('email', body.email).first()

      // Always return success to prevent email enumeration
      if (user) {
        const token = await this.broker.createToken(body.email)

        // Generate reset URL
        const baseUrl = process.env.APP_URL ?? `${c.req.header('host') ?? 'localhost'}`
        const protocol = baseUrl.startsWith('localhost') ? 'http' : 'https'
        const resetUrl = `${protocol}://${baseUrl}/reset-password/${token}?email=${encodeURIComponent(body.email)}`

        // Send password reset email
        try {
          const mailService = c.get('mail') as OrbitSignal | undefined
          if (mailService) {
            const mail = new ResetPasswordMail(
              { email: body.email, name: user.name },
              resetUrl,
              60 // 60 minutes expiration
            )
            await mailService.send(mail)
          } else {
            // Fallback: log to console if mail service not configured
            console.log(`[Fortify] Password reset email for ${body.email}`)
            console.log(`[Fortify] Reset URL: ${resetUrl}`)
          }
        } catch (mailError) {
          console.error('[Fortify] Failed to send password reset email:', mailError)
          // Continue anyway - don't fail the request due to email issues
        }

        // Record successful attempt if rate limiter is available
        if (this.rateLimiter) {
          const clientIp = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'
          this.rateLimiter.recordSuccess(`password-reset:${clientIp}`)
        }
      }

      if (this.config.jsonMode) {
        return c.json({
          message: 'If the email exists, a password reset link has been sent.',
        })
      }

      return c.redirect('/forgot-password?status=sent')
    } catch (error) {
      console.error('[Fortify] Forgot password error:', error)
      if (this.config.jsonMode) {
        return c.json({ error: 'Failed to process request' }, 500)
      }
      return c.redirect('/forgot-password?error=server_error')
    }
  }

  private defaultForgotPasswordHtml(csrfToken?: string): string {
    const csrfField = csrfToken ? `<input type="hidden" name="_token" value="${csrfToken}">` : ''
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forgot Password - Gravito</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { width: 100%; max-width: 400px; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; text-align: center; }
    .subtitle { color: #888; text-align: center; margin-bottom: 1.5rem; font-size: 0.875rem; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #888; }
    input { width: 100%; padding: 0.75rem 1rem; background: #1a1a1a; border: 1px solid #333; border-radius: 0.5rem; color: #fff; font-size: 1rem; }
    input:focus { outline: none; border-color: #14f195; }
    button { width: 100%; padding: 0.75rem 1rem; background: #14f195; border: none; border-radius: 0.5rem; color: #000; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 1rem; }
    button:hover { background: #0fd17d; }
    .links { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; }
    .links a { color: #14f195; text-decoration: none; }
    .success { background: #14f195; color: #000; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1rem; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Forgot Password</h1>
    <p class="subtitle">Enter your email and we'll send you a reset link.</p>
    <form method="POST" action="/forgot-password">
      ${csrfField}
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
      </div>
      <button type="submit">Send Reset Link</button>
    </form>
    <div class="links">
      <a href="/login">Back to login</a>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
}
