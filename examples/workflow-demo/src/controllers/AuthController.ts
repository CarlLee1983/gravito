import type { GravitoContext, GravitoNext } from '@gravito/core'
import { AuthorizationException } from '@gravito/core'
import { AuthService } from '../services/AuthService'

const authService = new AuthService()

export class AuthController {
  private readonly service = authService

  register = async (ctx: GravitoContext) => {
    const body = await ctx.req.json()
    const { name, email, password } = body
    if (!name || !email || !password) {
      return ctx.json({ error: 'Missing fields' }, 400)
    }

    if (await this.service.findByEmail(email)) {
      return ctx.json({ error: 'Email already registered' }, 409)
    }

    const user = await this.service.register(name, email, password)
    const token = await this.service.login(email, password)
    return ctx.json({ token, user })
  }

  login = async (ctx: GravitoContext) => {
    const body = await ctx.req.json()
    const { email, password } = body
    const token = await this.service.login(email, password)
    if (!token) {
      return ctx.json({ error: 'Invalid credentials' }, 401)
    }
    const user = await this.service.findByEmail(email)
    return ctx.json({ token, user })
  }

  requireAuth = async (ctx: GravitoContext, next: GravitoNext) => {
    const header = ctx.req.header('authorization') ?? ''
    const token = header.replace(/^Bearer\s+/i, '')
    const user = await this.service.findByToken(token)
    if (!user) {
      throw new AuthorizationException('Invalid or missing token')
    }
    ctx.set('user', user)
    await next()
  }

  getUser = (ctx: GravitoContext) => ctx.state.user
}
