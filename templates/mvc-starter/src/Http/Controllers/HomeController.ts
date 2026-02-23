import type { GravitoContext } from '@gravito/core'

export class HomeController {
  async index(ctx: GravitoContext) {
    return ctx.view.render('home', {
      title: 'Welcome to MVC Application',
      authenticated: ctx.auth?.user ? true : false,
    })
  }

  async dashboard(ctx: GravitoContext) {
    if (!ctx.auth?.user) {
      return ctx.redirect('/login')
    }
    return ctx.view.render('dashboard', {
      user: ctx.auth.user,
    })
  }
}
