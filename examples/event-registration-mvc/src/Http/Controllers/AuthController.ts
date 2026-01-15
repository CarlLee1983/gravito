import { DB } from '@gravito/atlas'
import type { HashManager } from '@gravito/sentinel'
import { type User, UserRole } from '../../Models/User'
import { Controller } from './Controller'

export class AuthController extends Controller {
  /**
   * Show login form
   */
  async showLogin(ctx: any) {
    return ctx.inertia('Auth/Login')
  }

  /**
   * Handle login
   */
  async login(ctx: any) {
    const { email, password } = ctx.get('data') as any
    const auth = ctx.get('auth') as any
    const session = ctx.get('session') as any

    if (!(await auth.attempt({ email, password }))) {
      session.flash('error', 'Invalid credentials')
      return ctx.redirect('/login')
    }

    // Get the authenticated user
    const user = await auth.user()

    // Set legacy session key for compatibility if needed (optional)
    session.put('user_id', user.id)
    session.put('user_role', user.role)

    session.flash('success', 'Welcome back!')

    if (user.role === UserRole.ADMIN) {
      return ctx.redirect('/admin')
    }

    return ctx.redirect('/profile')
  }

  /**
   * Show registration form
   */
  async showRegister(ctx: any) {
    return ctx.inertia('Auth/Register')
  }

  /**
   * Handle registration
   */
  async register(ctx: any) {
    const { name, email, password } = ctx.get('data') as any
    const hash = ctx.get('hash') as HashManager
    const auth = ctx.get('auth') as any
    const session = ctx.get('session') as any

    // Check if email exists
    const exists = await DB.table<User>('users').where('email', email).exists()

    if (exists) {
      session.flash('error', 'Email already registered')
      return ctx.redirect('/register')
    }

    // Create user
    const [user] = await DB.table<User>('users').insert({
      name,
      email,
      password: await hash.make(password),
      role: UserRole.USER,
    })

    // Auto login using Auth service
    await auth.login(user)

    // Set legacy session key for compatibility
    session.put('user_id', user.id)
    session.put('user_role', user.role)

    session.flash('success', 'Registration successful! Welcome to the community.')

    return ctx.redirect('/profile')
  }

  /**
   * Handle logout
   */
  async logout(ctx: any) {
    const auth = ctx.get('auth') as any
    const session = ctx.get('session') as any

    await auth.logout()
    session.destroy() // Clear all session data

    return ctx.redirect('/')
  }
}
