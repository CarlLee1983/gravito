import type { GravitoContext } from '@gravito/core'
import { LoginRequest } from '../Requests/LoginRequest'
import { RegisterRequest } from '../Requests/RegisterRequest'

export class AuthController {
  async showLogin(ctx: GravitoContext) {
    return ctx.view.render('auth/login', { title: 'Login' })
  }

  async login(ctx: GravitoContext) {
    try {
      const body = await ctx.request.json()
      const _data = LoginRequest.parse(body)

      // TODO: 驗證用戶認證信息
      // const user = await User.where('email', data.email).first()
      // if (!user || !await user.verifyPassword(data.password)) {
      //   return ctx.json({ error: 'Invalid credentials' }, 401)
      // }

      // await ctx.auth.login(user)
      // return ctx.redirect('/dashboard')

      return ctx.json({ error: 'Not implemented' }, 501)
    } catch (_error) {
      return ctx.json({ error: 'Invalid request' }, 400)
    }
  }

  async showRegister(ctx: GravitoContext) {
    return ctx.view.render('auth/register', { title: 'Register' })
  }

  async register(ctx: GravitoContext) {
    try {
      const body = await ctx.request.json()
      const _data = RegisterRequest.parse(body)

      // TODO: 創建新用戶
      // const user = await User.create({
      //   name: data.name,
      //   email: data.email,
      //   password: await hashPassword(data.password),
      // })
      //
      // await ctx.auth.login(user)
      // return ctx.redirect('/dashboard')

      return ctx.json({ error: 'Not implemented' }, 501)
    } catch (_error) {
      return ctx.json({ error: 'Invalid request' }, 400)
    }
  }

  async logout(ctx: GravitoContext) {
    // await ctx.auth.logout()
    // return ctx.redirect('/')
    return ctx.json({ error: 'Not implemented' }, 501)
  }
}
