import { column, Model } from '@gravito/atlas'
import type { Authenticatable } from '@gravito/sentinel'

export class User extends Model implements Authenticatable {
  static table = 'users'

  @column({ isPrimary: true })
  id!: number

  @column()
  name!: string

  @column()
  email!: string

  @column()
  password!: string

  @column()
  created_at!: Date

  @column()
  updated_at!: Date

  getAuthIdentifier(): string | number {
    return this.id
  }

  getAuthPassword(): string {
    return this.password
  }
}
