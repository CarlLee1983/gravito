import type { GravitoContext } from '@gravito/core'
import { Controller } from './Controller'

export class HomeController extends Controller {
  async index(ctx: any) {
    return (ctx.get('inertia') as any)('Home', {
      title: 'Welcome to Event Registration',
    })
  }
}
