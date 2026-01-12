/**
 * Auth Controller
 *
 * Handles user authentication: login, register, logout.
 */

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import type { SessionService } from '@gravito/pulsar'
import type { AuthManager } from '@gravito/sentinel'
import { User } from '../../Models'
import { CartService } from '../../Services'

export class AuthController {
  /**
   * Show login page
   */
  static async showLogin(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const auth = ctx.get('auth') as AuthManager

    if (await auth.check()) {
      return ctx.redirect('/')
    }

    return inertia.render('Auth/Login')
  }

  /**
   * Handle login
   */
  static async login(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as { email: string; password: string }
    const auth = ctx.get('auth') as AuthManager
    const session = ctx.get('session') as SessionService

    const { email, password } = body

    if (!email || !password) {
      session.flash('errors', { email: ['請輸入電子郵件和密碼'] })
      return ctx.redirect('/login', 303)
    }

    const success = await auth.attempt({ email, password })

    if (success) {
      const guestSessionId = session.id()
      session.regenerate()

      // Merge guest cart with user cart
      const user = await auth.user()
      if (user && guestSessionId) {
        const cartService = new CartService()
        await cartService.mergeCarts(guestSessionId, user.getAuthIdentifier() as number)
      }

      return ctx.redirect('/')
    }

    session.flash('errors', { email: ['帳號或密碼錯誤'] })
    return ctx.redirect('/login', 303)
  }

  /**
   * Show register page
   */
  static async showRegister(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const auth = ctx.get('auth') as AuthManager

    if (await auth.check()) {
      return ctx.redirect('/')
    }

    return inertia.render('Auth/Register')
  }

  /**
   * Handle registration
   */
  static async register(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as {
      name: string
      email: string
      password: string
      password_confirmation: string
    }
    const auth = ctx.get('auth') as AuthManager
    const session = ctx.get('session') as SessionService

    const { name, email, password, password_confirmation } = body
    const errors: Record<string, string[]> = {}

    // Validation
    if (!name || name.length < 2) {
      errors.name = ['姓名至少需要 2 個字元']
    }

    if (!email || !email.includes('@')) {
      errors.email = ['請輸入有效的電子郵件']
    } else {
      // Check if email exists
      const existingResult = await DB.raw<{ id: number }>('SELECT id FROM users WHERE email = ?', [
        email,
      ])
      if (existingResult.rows[0]) {
        errors.email = ['此電子郵件已被註冊']
      }
    }

    if (!password || password.length < 6) {
      errors.password = ['密碼至少需要 6 個字元']
    }

    if (password !== password_confirmation) {
      errors.password_confirmation = ['密碼確認不符']
    }

    if (Object.keys(errors).length > 0) {
      session.flash('errors', errors)
      session.flash('old', { name, email })
      return ctx.redirect('/register', 303)
    }

    // Create user
    const hashedPassword = await Bun.password.hash(password, { algorithm: 'bcrypt' })
    const result = await DB.raw<{ id: number }>(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?) RETURNING id',
      [name, email, hashedPassword, 'customer']
    )

    // Auto-login
    const user = new User()
    user.id = result.rows[0]?.id
    user.name = name
    user.email = email
    user.password = hashedPassword
    user.role = 'customer'

    const guestSessionId = session.id()
    await auth.login(user)
    session.regenerate()

    // Merge guest cart
    if (guestSessionId) {
      const cartService = new CartService()
      await cartService.mergeCarts(guestSessionId, user.id)
    }

    return ctx.redirect('/')
  }

  /**
   * Handle logout
   */
  static async logout(ctx: GravitoContext) {
    const auth = ctx.get('auth') as AuthManager
    await auth.logout()
    return ctx.redirect('/login')
  }
}
