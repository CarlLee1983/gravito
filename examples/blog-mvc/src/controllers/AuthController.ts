import type { GravitoContext } from '@gravito/core'
import type { InertiaHelper } from '@gravito/ion'
import type { SessionService } from '@gravito/pulsar'
import type { AuthManager } from '@gravito/sentinel'

export class AuthController {
  /**
   * Show login page
   */
  async showLogin(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaHelper
    const auth = ctx.get('auth') as AuthManager

    // If already logged in, redirect to home
    if (await auth.check()) {
      return ctx.redirect('/')
    }

    return inertia.render('Auth/Login')
  }

  /**
   * Handle login request
   */
  async login(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as any
    const auth = ctx.get('auth') as AuthManager
    const session = ctx.get('session') as SessionService

    const { email, password } = body

    if (!email || !password) {
      session.flash('errors', { email: ['Email and password are required'] })
      return ctx.redirect('/login', 303)
    }

    const success = await auth.attempt({ email, password })

    if (success) {
      session.regenerate()
      return ctx.redirect('/')
    }

    session.flash('errors', { email: ['Invalid credentials'] })
    return ctx.redirect('/login', 303)
  }

  /**
   * Handle logout request
   */
  async logout(ctx: GravitoContext) {
    const auth = ctx.get('auth') as AuthManager
    await auth.logout()
    return ctx.redirect('/login')
  }
}
