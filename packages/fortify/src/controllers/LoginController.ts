import type { GravitoContext } from 'gravito-core'
import { AuthManager } from '@gravito/sentinel'
import type { FortifyConfig } from '../config'
import type { ViewService } from '../types'

/**
 * LoginController handles user authentication
 */
export class LoginController {
    constructor(private config: FortifyConfig) { }

    /**
     * Show login form
     * GET /login
     */
    async show(c: GravitoContext): Promise<Response> {
        // Check if already authenticated
        const auth = c.get('auth') as AuthManager
        if (auth && await auth.check()) {
            return c.redirect(this.config.redirects.login ?? '/dashboard')
        }

        // For JSON mode (SPA), return a simple response
        if (this.config.jsonMode) {
            return c.json({ view: 'login' })
        }

        // Render view if view service is available
        const view = c.get('view') as ViewService | undefined
        if (view?.render && this.config.views?.login) {
            return c.html(view.render(this.config.views.login))
        }

        // Default: return basic HTML form
        return c.html(this.defaultLoginHtml())
    }

    /**
     * Handle login attempt
     * POST /login
     */
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

        const remember = body.remember ?? false

        try {
            const success = await auth.attempt(credentials, remember)

            if (!success) {
                if (this.config.jsonMode) {
                    return c.json({ error: 'Invalid credentials' }, 401)
                }
                // Redirect back with error (in real app, use session flash)
                return c.redirect('/login?error=invalid_credentials')
            }

            if (this.config.jsonMode) {
                const user = await auth.user()
                return c.json({
                    message: 'Login successful',
                    user,
                    redirect: this.config.redirects.login ?? '/dashboard'
                })
            }

            return c.redirect(this.config.redirects.login ?? '/dashboard')
        } catch (error) {
            console.error('[Fortify] Login error:', error)
            if (this.config.jsonMode) {
                return c.json({ error: 'Authentication failed' }, 500)
            }
            return c.redirect('/login?error=server_error')
        }
    }

    private defaultLoginHtml(): string {
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
