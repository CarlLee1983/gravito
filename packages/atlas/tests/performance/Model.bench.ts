import { bench, describe } from 'bun:test'
import { column, Model } from '../../src'

class User extends Model {
  static override table = 'users'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string
  @column() declare email: string

  get fullNameAttribute() {
    return `User: ${this.name}`
  }
}

describe('Model Performance', () => {
  const row = { id: 1, name: 'Carl', email: 'carl@gravito.dev' }

  bench('Model.hydrate', () => {
    User.hydrate(row)
  })

  bench('Model attribute access', () => {
    const user = User.hydrate(row)
    const _ = user.name
    const __ = user.email
  })

  bench('Model accessor access', () => {
    const user = User.hydrate(row)
    const _ = (user as any).fullName
  })
})
