import type { GravitoContext } from 'gravito-core'
import { AuthManager, HashManager } from '@gravito/sentinel'
import type { FortifyConfig } from '../config'
import type { ViewService } from '../types'

/**
 * RegisterController handles user registration
 */
export class RegisterController {
    constructor(private config: FortifyConfig) { }

    /**
     * Show registration form
     * GET /register
     */
    async show(c: GravitoContext): Promise<Response> {
        // Check if already authenticated
        const auth = c.get('auth') as AuthManager
        if (auth && await auth.check()) {
            return c.redirect(this.config.redirects.register ?? '/dashboard')
        }

        // For JSON mode (SPA), return a simple response
        if (this.config.jsonMode) {
            return c.json({ view: 'register' })
        }

        // Render view if view service is available
        const view = c.get('view') as ViewService | undefined
        if (view?.render && this.config.views?.register) {
            return c.html(view.render(this.config.views.register))
        }

        // Default: return basic HTML form
        return c.html(this.defaultRegisterHtml())
    }

    /**
     * Handle registration
     * POST /register
     */
    async store(c: GravitoContext): Promise<Response> {
        const auth = c.get('auth') as AuthManager
        if (!auth) {
            return c.json({ error: 'Authentication service not available' }, 500)
        }

        const body = await c.req.json<{
            name?: string
            email?: string
            password?: string
            password_confirmation?: string
        }>()

        // Basic validation
        if (!body.email || !body.password) {
            if (this.config.jsonMode) {
                return c.json({ error: 'Email and password are required' }, 422)
            }
            return c.redirect('/register?error=validation')
        }

        if (body.password !== body.password_confirmation) {
            if (this.config.jsonMode) {
                return c.json({ error: 'Passwords do not match' }, 422)
            }
            return c.redirect('/register?error=password_mismatch')
        }

        try {
            // Get User model from config
            const UserModel = this.config.userModel()

            // Check if user already exists
            const existingUser = await (UserModel as any).query().where('email', body.email).first()
            if (existingUser) {
                if (this.config.jsonMode) {
                    return c.json({ error: 'Email already registered' }, 422)
                }
                return c.redirect('/register?error=email_exists')
            }

            // Hash password
            const hasher = new HashManager()
            const hashedPassword = await hasher.make(body.password)

            // Create user
            const user = await (UserModel as any).create({
                name: body.name ?? '',
                email: body.email,
                password: hashedPassword,
            })

            // Log the user in
            await auth.login(user)

            if (this.config.jsonMode) {
                return c.json({
                    message: 'Registration successful',
                    user,
                    redirect: this.config.redirects.register ?? '/dashboard'
                }, 201)
            }

            return c.redirect(this.config.redirects.register ?? '/dashboard')
        } catch (error) {
            console.error('[Fortify] Registration error:', error)
            if (this.config.jsonMode) {
                return c.json({ error: 'Registration failed' }, 500)
            }
            return c.redirect('/register?error=server_error')
        }
    }

    private defaultRegisterHtml(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Register - Gravito</title>
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
  </style>
</head>
<body>
  <div class="container">
    <h1>Create Account</h1>
    <form method="POST" action="/register">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" required>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
      </div>
      <div class="form-group">
        <label for="password_confirmation">Confirm Password</label>
        <input type="password" id="password_confirmation" name="password_confirmation" required>
      </div>
      <button type="submit">Create Account</button>
    </form>
    <div class="links">
      Already have an account? <a href="/login">Sign in</a>
    </div>
  </div>
</body>
</html>
    `.trim()
    }
}
