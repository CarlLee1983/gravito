import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { User } from '../../../Models/User'
import { Controller } from '../Controller'

export class UserController extends Controller {
  async index(ctx: any) {
    const users = await DB.table<User>('users').orderBy('created_at', 'desc').get()

    return ctx.inertia('Admin/Users/Index', { users })
  }
}
