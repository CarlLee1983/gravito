/**
 * Comment Model
 *
 * 代表對文章的留言。展示簡單的關聯與驗證。
 */

import { BelongsTo, column, Model } from '@gravito/atlas'

export class Comment extends Model {
  static table = 'comments'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare content: string

  @column()
  declare authorId: number

  @column()
  declare postId: number

  @column()
  declare isApproved: boolean

  @column()
  declare createdAt: Date

  @column()
  declare updatedAt: Date

  // Relationships (避免循環依賴，使用 any)
  @BelongsTo(() => undefined as any, 'authorId')
  declare author: any

  @BelongsTo(() => undefined as any, 'postId')
  declare post: any

  /**
   * 取得留言的公開資料
   */
  toPublicJSON() {
    return {
      id: this.id,
      content: this.content,
      author: this.author?.toPublicJSON?.(),
      createdAt: this.createdAt,
    }
  }
}
