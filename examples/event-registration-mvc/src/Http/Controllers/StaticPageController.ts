import { Controller } from './Controller'

export class StaticPageController extends Controller {
  async docs(ctx: any) {
    return ctx.inertia('Info/Docs')
  }

  async status(ctx: any) {
    return ctx.inertia('Info/Status')
  }

  async help(ctx: any) {
    return ctx.inertia('Info/Help')
  }

  async terms(ctx: any) {
    return ctx.inertia('Info/Legal', { type: 'terms' })
  }

  async privacy(ctx: any) {
    return ctx.inertia('Info/Legal', { type: 'privacy' })
  }
}
