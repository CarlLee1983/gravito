import type { GravitoContext } from 'gravito-core'
import { PasswordBroker, HashManager, InMemoryPasswordResetTokenRepository } from '@gravito/sentinel'
import type { FortifyConfig } from '../config'
import type { ViewService } from '../types'

/**
 * ResetPasswordController handles password reset
 */
export class ResetPasswordController {
    private broker: PasswordBroker
    private hasher: HashManager

    constructor(private config: FortifyConfig) {
        this.hasher = new HashManager()
        // In production, use a database-backed repository (shared with ForgotPasswordController)
        this.broker = new PasswordBroker(
            new InMemoryPasswordResetTokenRepository(),
            this.hasher
        )
    }

    /**
     * Show reset password form
     * GET /reset-password/:token
     */
    async show(c: GravitoContext): Promise<Response> {
        const token = c.req.param('token')
        const email = c.req.query('email')

        if (this.config.jsonMode) {
            return c.json({ view: 'reset-password', token, email })
        }

        const view = c.get('view') as ViewService | undefined
        if (view?.render && this.config.views?.resetPassword) {
            return c.html(view.render(this.config.views.resetPassword, { token, email }))
        }

        return c.html(this.defaultResetPasswordHtml(token ?? '', email ?? ''))
    }

    /**
     * Handle password reset
     * POST /reset-password
     */
    async store(c: GravitoContext): Promise<Response> {
        const body = await c.req.json<{
            token?: string
            email?: string
            password?: string
            password_confirmation?: string
        }>()

        // Validation
        if (!body.token || !body.email || !body.password) {
            if (this.config.jsonMode) {
                return c.json({ error: 'Token, email and password are required' }, 422)
            }
            return c.redirect(`/reset-password/${body.token}?email=${body.email}&error=validation`)
        }

        if (body.password !== body.password_confirmation) {
            if (this.config.jsonMode) {
                return c.json({ error: 'Passwords do not match' }, 422)
            }
            return c.redirect(`/reset-password/${body.token}?email=${body.email}&error=password_mismatch`)
        }

        try {
            // Verify token
            const valid = await this.broker.verifyToken(body.email, body.token)
            if (!valid) {
                if (this.config.jsonMode) {
                    return c.json({ error: 'Invalid or expired reset token' }, 422)
                }
                return c.redirect('/forgot-password?error=invalid_token')
            }

            // Get User model and update password
            const UserModel = this.config.userModel()
            const user = await (UserModel as any).query().where('email', body.email).first()

            if (!user) {
                if (this.config.jsonMode) {
                    return c.json({ error: 'User not found' }, 404)
                }
                return c.redirect('/forgot-password?error=user_not_found')
            }

            // Hash new password and update
            const hashedPassword = await this.hasher.make(body.password)
            user.password = hashedPassword
            await user.save()

            // Invalidate the token
            await this.broker.invalidate(body.email)

            if (this.config.jsonMode) {
                return c.json({
                    message: 'Password reset successful',
                    redirect: this.config.redirects.passwordReset ?? '/login'
                })
            }

            return c.redirect(this.config.redirects.passwordReset ?? '/login?status=password_reset')
        } catch (error) {
            console.error('[Fortify] Reset password error:', error)
            if (this.config.jsonMode) {
                return c.json({ error: 'Failed to reset password' }, 500)
            }
            return c.redirect('/forgot-password?error=server_error')
        }
    }

    private defaultResetPasswordHtml(token: string, email: string): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password - Gravito</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { width: 100%; max-width: 400px; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 1.5rem; text-align: center; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #888; }
    input { width: 100%; padding: 0.75rem 1rem; background: #1a1a1a; border: 1px solid #333; border-radius: 0.5rem; color: #fff; font-size: 1rem; }
    input:focus { outline: none; border-color: #14f195; }
    input[readonly] { opacity: 0.6; }
    button { width: 100%; padding: 0.75rem 1rem; background: #14f195; border: none; border-radius: 0.5rem; color: #000; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 1rem; }
    button:hover { background: #0fd17d; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Reset Password</h1>
    <form method="POST" action="/reset-password">
      <input type="hidden" name="token" value="${token}">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" value="${email}" readonly>
      </div>
      <div class="form-group">
        <label for="password">New Password</label>
        <input type="password" id="password" name="password" required>
      </div>
      <div class="form-group">
        <label for="password_confirmation">Confirm Password</label>
        <input type="password" id="password_confirmation" name="password_confirmation" required>
      </div>
      <button type="submit">Reset Password</button>
    </form>
  </div>
</body>
</html>
    `.trim()
    }
}
