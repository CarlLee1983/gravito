/**
 * User Model
 *
 * 代表一個系統使用者。此範例展示基本的 Model 定義與關聯。
 */

import { column, HasMany, Model } from '@gravito/atlas'

export class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare password: string // 實際應用應使用 hashed passwords

  @column()
  declare bio: string | null

  @column()
  declare isActive: boolean

  @column()
  declare createdAt: Date

  @column()
  declare updatedAt: Date

  // Relationships (使用 any 避免循環依賴)
  @HasMany(() => undefined as any)
  declare posts: any[]

  @HasMany(() => undefined as any)
  declare comments: any[]

  /**
   * 取得使用者的公開資料（不包含密碼）
   */
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      bio: this.bio,
      createdAt: this.createdAt,
    }
  }
}
