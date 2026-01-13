import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
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
    const { email, password } = await ctx.req.json()
    const hash = ctx.get('hash') as HashManager

    const user = await DB.table<User>('users').where('email', email).first()

    if (!user || !(await hash.check(password, user.password))) {
      return ctx.json({ error: 'Invalid credentials' }, 401)
    }

    const session = ctx.get('session')
    session.set('user_id', user.id)
    session.set('user_role', user.role)

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
    const { name, email, password } = await ctx.req.json()
    const hash = ctx.get('hash') as HashManager

    // Check if email exists
    const exists = await DB.table<User>('users').where('email', email).exists()

    if (exists) {
      return ctx.json({ error: 'Email already registered' }, 400)
    }

    // Create user
    const [user] = await DB.table<User>('users').insert({
      name,
      email,
      password: await hash.make(password),
      role: UserRole.USER,
    })

    // Auto login
    const session = ctx.get('session')
    session.set('user_id', user.id)
    session.set('user_role', user.role)

    return ctx.redirect('/profile')
  }

  /**
   * Handle logout
   */
  async logout(ctx: any) {
    const session = ctx.get('session')
    session.destroy()
    return ctx.redirect('/')
  }
}
