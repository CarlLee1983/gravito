import { PlanetCore } from 'gravito-core'
import type { Context } from '@gravito/photon'

export class UserController {
  constructor(private core: PlanetCore) {}

  async index(c: Context) {
    return c.json({ message: 'User index' })
  }
}
