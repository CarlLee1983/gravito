/**
 * Post Model
 *
 * 代表一篇部落格文章。展示常見的模型欄位與關聯。
 */

import { BelongsTo, column, HasMany, Model } from '@gravito/atlas'

export class Post extends Model {
  static table = 'posts'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare slug: string

  @column()
  declare content: string

  @column()
  declare excerpt: string | null

  @column()
  declare authorId: number

  @column()
  declare status: 'draft' | 'published' | 'archived'

  @column()
  declare publishedAt: Date | null

  @column()
  declare viewCount: number

  @column()
  declare createdAt: Date

  @column()
  declare updatedAt: Date

  // Relationships (避免循環依賴，使用 any)
  @BelongsTo(() => undefined as any, 'authorId')
  declare author: any

  @HasMany(() => undefined as any)
  declare comments: any[]

  /**
   * 檢查文章是否已發佈
   */
  isPublished(): boolean {
    return this.status === 'published' && this.publishedAt !== null
  }

  /**
   * 取得文章的公開資料
   */
  toPublicJSON() {
    return {
      id: this.id,
      title: this.title,
      slug: this.slug,
      excerpt: this.excerpt || this.content.substring(0, 200),
      author: this.author?.toPublicJSON?.(),
      status: this.status,
      publishedAt: this.publishedAt,
      viewCount: this.viewCount,
      createdAt: this.createdAt,
    }
  }
}
