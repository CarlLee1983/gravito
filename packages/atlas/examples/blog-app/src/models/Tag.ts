/**
 * Tag Model
 *
 * 代表文章標籤。簡單的模型，用於展示標籤關聯。
 */

import { column, Model } from '@gravito/atlas'

export class Tag extends Model {
  static table = 'tags'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare description: string | null

  @column()
  declare postCount: number

  @column()
  declare createdAt: Date

  /**
   * 取得標籤的公開資料
   */
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      postCount: this.postCount,
    }
  }
}
