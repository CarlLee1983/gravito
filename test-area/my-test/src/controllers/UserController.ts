import type { Context } from '@gravito/photon'

export class UserController {
  async index(c: Context) {
    return c.json({ message: 'User index' })
  }
}
