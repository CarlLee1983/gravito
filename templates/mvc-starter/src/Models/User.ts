import { Model } from '@gravito/atlas'

/**
 * User Model - 用戶數據模型
 * 
 * @example
 * ```ts
 * const user = await User.find(1)
 * const users = await User.all()
 * ```
 */
export class User extends Model {
  static table = 'users'

  static fillable = ['name', 'email', 'password', 'email_verified_at']

  static hidden = ['password']

  declare id: number
  declare name: string
  declare email: string
  declare password: string
  declare emailVerifiedAt?: Date
  declare createdAt: Date
  declare updatedAt: Date
}
