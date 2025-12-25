import type { GravitoContext } from 'gravito-core'
import { AuthManager, EmailVerificationService } from '@gravito/sentinel'
import type { FortifyConfig } from '../config'
import type { ViewService } from '../types'

/**
 * VerifyEmailController handles email verification
 */
export class VerifyEmailController {
    private verificationService: EmailVerificationService

    constructor(private config: FortifyConfig) {
        // In production, use a proper secret from config
        const secret = process.env.APP_KEY ?? 'gravito-fortify-secret-key'
        this.verificationService = new EmailVerificationService(secret)
    }

    /**
     * Show verification notice
     * GET /verify-email
     */
    async show(c: GravitoContext): Promise<Response> {
        const auth = c.get('auth') as AuthManager

        if (!auth || !await auth.check()) {
            return c.redirect('/login')
        }

        const user = await auth.user()

        if (this.config.jsonMode) {
            return c.json({
                view: 'verify-email',
                verified: !!(user as any)?.email_verified_at
            })
        }

        const view = c.get('view') as ViewService | undefined
        if (view?.render && this.config.views?.verifyEmail) {
            return c.html(view.render(this.config.views.verifyEmail, { user }))
        }

        return c.html(this.defaultVerifyEmailHtml())
    }

    /**
     * Verify email with signed URL
     * GET /verify-email/:id/:hash
     */
    async verify(c: GravitoContext): Promise<Response> {
        const id = c.req.param('id')
        const hash = c.req.param('hash')

        if (!id || !hash) {
            if (this.config.jsonMode) {
                return c.json({ error: 'Invalid verification link' }, 422)
            }
            return c.redirect('/verify-email?error=invalid_link')
        }

        try {
            // Verify the token
            const payload = this.verificationService.verifyToken(hash)

            if (!payload || String(payload.id) !== id) {
                if (this.config.jsonMode) {
                    return c.json({ error: 'Invalid or expired verification link' }, 422)
                }
                return c.redirect('/verify-email?error=invalid_link')
            }

            // Get User model and update verified status
            const UserModel = this.config.userModel()
            const user = await (UserModel as any).find(id)

            if (!user) {
                if (this.config.jsonMode) {
                    return c.json({ error: 'User not found' }, 404)
                }
                return c.redirect('/verify-email?error=user_not_found')
            }

            // Mark email as verified
            user.email_verified_at = new Date()
            await user.save()

            if (this.config.jsonMode) {
                return c.json({
                    message: 'Email verified successfully',
                    redirect: this.config.redirects.emailVerification ?? '/dashboard'
                })
            }

            return c.redirect(this.config.redirects.emailVerification ?? '/dashboard?verified=1')
        } catch (error) {
            console.error('[Fortify] Email verification error:', error)
            if (this.config.jsonMode) {
                return c.json({ error: 'Verification failed' }, 500)
            }
            return c.redirect('/verify-email?error=server_error')
        }
    }

    /**
     * Resend verification email
     * POST /email/verification-notification
     */
    async send(c: GravitoContext): Promise<Response> {
        const auth = c.get('auth') as AuthManager

        if (!auth || !await auth.check()) {
            if (this.config.jsonMode) {
                return c.json({ error: 'Unauthenticated' }, 401)
            }
            return c.redirect('/login')
        }

        try {
            const user = await auth.user() as any

            if (user?.email_verified_at) {
                if (this.config.jsonMode) {
                    return c.json({ message: 'Email already verified' })
                }
                return c.redirect(this.config.redirects.emailVerification ?? '/dashboard')
            }

            // Create verification token
            const token = this.verificationService.createToken({
                id: user.id,
                email: user.email,
            })

            // TODO: Send email with verification link
            // In production, integrate with @gravito/orbit-mail
            console.log(`[Fortify] Verification token for ${user.email}: ${token}`)
            console.log(`[Fortify] Verification URL: /verify-email/${user.id}/${token}`)

            if (this.config.jsonMode) {
                return c.json({ message: 'Verification email sent' })
            }

            return c.redirect('/verify-email?status=sent')
        } catch (error) {
            console.error('[Fortify] Send verification error:', error)
            if (this.config.jsonMode) {
                return c.json({ error: 'Failed to send verification email' }, 500)
            }
            return c.redirect('/verify-email?error=server_error')
        }
    }

    private defaultVerifyEmailHtml(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Email - Gravito</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { width: 100%; max-width: 400px; padding: 2rem; text-align: center; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    p { color: #888; margin-bottom: 1.5rem; }
    button { padding: 0.75rem 2rem; background: #14f195; border: none; border-radius: 0.5rem; color: #000; font-size: 1rem; font-weight: 600; cursor: pointer; }
    button:hover { background: #0fd17d; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Verify Your Email</h1>
    <p>Please click the button below to resend the verification email.</p>
    <form method="POST" action="/email/verification-notification">
      <button type="submit">Resend Verification Email</button>
    </form>
  </div>
</body>
</html>
    `.trim()
    }
}
