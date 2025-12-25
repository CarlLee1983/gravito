import type { GravitoContext } from 'gravito-core'
import { PasswordBroker, HashManager, InMemoryPasswordResetTokenRepository } from '@gravito/sentinel'
import type { FortifyConfig } from '../config'
import type { ViewService } from '../types'

/**
 * ForgotPasswordController handles password reset requests
 */
export class ForgotPasswordController {
    private broker: PasswordBroker

    constructor(private config: FortifyConfig) {
        // In production, use a database-backed repository
        this.broker = new PasswordBroker(
            new InMemoryPasswordResetTokenRepository(),
            new HashManager()
        )
    }

    /**
     * Show forgot password form
     * GET /forgot-password
     */
    async show(c: GravitoContext): Promise<Response> {
        if (this.config.jsonMode) {
            return c.json({ view: 'forgot-password' })
        }

        const view = c.get('view') as ViewService | undefined
        if (view?.render && this.config.views?.forgotPassword) {
            return c.html(view.render(this.config.views.forgotPassword))
        }

        return c.html(this.defaultForgotPasswordHtml())
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

        try {
            // Get User model from config
            const UserModel = this.config.userModel()

            // Check if user exists
            const user = await (UserModel as any).query().where('email', body.email).first()

            // Always return success to prevent email enumeration
            if (user) {
                const token = await this.broker.createToken(body.email)

                // TODO: Send email with reset link
                // In production, integrate with @gravito/orbit-mail
                console.log(`[Fortify] Password reset token for ${body.email}: ${token}`)
                console.log(`[Fortify] Reset URL: /reset-password/${token}?email=${encodeURIComponent(body.email)}`)
            }

            if (this.config.jsonMode) {
                return c.json({
                    message: 'If the email exists, a password reset link has been sent.'
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

    private defaultForgotPasswordHtml(): string {
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
