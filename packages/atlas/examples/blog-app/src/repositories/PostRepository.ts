/**
 * Post Repository
 *
 * 展示進階查詢模式，包括：
 * - 動態欄位選擇（使用 identifier()）
 * - 複雜篩選條件
 * - 全文搜尋
 * - 排序與分頁
 */

import { type ConnectionContract, DB, identifier } from '@gravito/atlas'
import type { Post } from '../models/Post'

export interface PostSearchFilters {
  query?: string // 搜尋標題或內容
  status?: string // 發佈狀態
  authorId?: number // 作者 ID
  tags?: string[] // 標籤（逗號分隔）
  sortBy?: 'recent' | 'popular' | 'trending' // 排序方式
  page?: number
  limit?: number
}

export class PostRepository {
  private connection: ConnectionContract

  constructor(connection?: ConnectionContract) {
    this.connection = connection || DB.connection()
  }

  /**
   * 搜尋文章 - 展示複雜的動態查詢
   *
   * ✅ 安全模式：
   * - 所有使用者輸入都通過參數綁定
   * - 動態欄位使用 identifier()
   * - 動態排序使用白名單驗證
   */
  async searchPosts(filters: PostSearchFilters): Promise<Post[]> {
    let query = this.connection.table('posts').select('*')

    // 文本搜尋
    if (filters.query) {
      const searchTerm = `%${filters.query}%`
      query = query.where((q) => {
        q.where('title', 'like', searchTerm).orWhere('content', 'like', searchTerm)
      })
    }

    // 狀態篩選
    if (filters.status) {
      query = query.where('status', filters.status)
    }

    // 作者篩選
    if (filters.authorId) {
      query = query.where('authorId', filters.authorId)
    }

    // 排序（使用白名單防止 SQL Injection）
    const sortMap: Record<string, [string, string]> = {
      recent: ['createdAt', 'desc'],
      popular: ['viewCount', 'desc'],
      trending: ['updatedAt', 'desc'],
    }

    const [sortColumn, sortDirection] = sortMap[filters.sortBy || 'recent']
    query = query.orderBy(sortColumn, sortDirection as any)

    // 分頁
    const limit = Math.min(filters.limit || 20, 100) // 限制最大 100
    const page = Math.max(filters.page || 1, 1)
    const offset = (page - 1) * limit

    const posts = await query.limit(limit).offset(offset).get()

    return posts
  }

  /**
   * 使用 SafeQueryBuilder 搜尋文章
   *
   * ✅ 進階安全查詢：展示 identifier() 用於動態欄位選擇
   */
  async searchPostsWithSQL(filters: PostSearchFilters): Promise<Post[]> {
    const searchTerm = filters.query ? `%${filters.query}%` : null
    const limit = Math.min(filters.limit || 20, 100)
    const page = Math.max(filters.page || 1, 1)
    const offset = (page - 1) * limit

    // 動態欄位選擇（使用 identifier()）
    // 此模式用於允許使用者選擇要傳回的欄位
    // ✅ 安全：identifier() 驗證欄位名稱
    const allowedFields = ['id', 'title', 'slug', 'excerpt', 'status', 'viewCount']
    const selectedFields = allowedFields.map((f) => identifier(f)).join(', ')

    // 使用 raw() 組建複雜查詢
    const posts = await this.connection.sql<any>`
      SELECT ${selectedFields}
      FROM posts
      WHERE status = ${'published'}
        ${searchTerm ? `AND (title LIKE ${searchTerm} OR content LIKE ${searchTerm})` : ''}
      ORDER BY createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    `.all()

    return posts
  }

  /**
   * 取得特定標籤的文章
   *
   * ✅ 動態篩選：使用 IN 子句的安全方式
   */
  async getPostsByTags(tags: string[], limit = 20): Promise<Post[]> {
    if (tags.length === 0) {
      return []
    }

    // 建立佔位符（? 或 $1, $2 等）
    const placeholders = tags.map(() => '?').join(',')

    const posts = await this.connection.raw(
      `
      SELECT DISTINCT p.* FROM posts p
      JOIN post_tags pt ON pt.postId = p.id
      JOIN tags t ON t.id = pt.tagId
      WHERE t.slug IN (${placeholders})
        AND p.status = 'published'
      ORDER BY p.createdAt DESC
      LIMIT ?
      `,
      [...tags, limit]
    )

    return posts.rows || []
  }

  /**
   * 取得熱門文章
   *
   * ✅ 聚合查詢：計算觀看次數與留言數
   */
  async getTrendingPosts(days = 7, limit = 10): Promise<Array<Post & { commentCount: number }>> {
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - days)

    const posts = await this.connection.sql<any>`
      SELECT
        p.*,
        COUNT(c.id) as commentCount
      FROM posts p
      LEFT JOIN comments c ON c.postId = p.id
      WHERE p.status = ${'published'}
        AND p.publishedAt >= ${daysAgo}
      GROUP BY p.id
      ORDER BY p.viewCount DESC, COUNT(c.id) DESC
      LIMIT ${limit}
    `.all()

    return posts
  }

  /**
   * 發佈文章
   *
   * ✅ 條件更新：確保只更新自己的文章
   */
  async publishPost(
    postId: number,
    userId: number
  ): Promise<{ success: boolean; message: string }> {
    // 驗證：確保使用者是文章作者
    const post = await this.connection.sql<{ authorId: number }>`
      SELECT authorId FROM posts WHERE id = ${postId}
    `.first()

    if (!post) {
      return { success: false, message: 'Post not found' }
    }

    if (post.authorId !== userId) {
      return { success: false, message: 'Unauthorized' }
    }

    // 發佈文章
    const result = await this.connection.sql`
      UPDATE posts
      SET status = ${'published'}, publishedAt = NOW(), updatedAt = NOW()
      WHERE id = ${postId} AND authorId = ${userId}
    `.execute()

    return {
      success: result.rowCount > 0,
      message: result.rowCount > 0 ? 'Published' : 'Failed to publish',
    }
  }

  /**
   * 增加文章觀看次數
   *
   * ✅ 原子操作：安全的計數器增加
   */
  async incrementViewCount(postId: number): Promise<void> {
    await this.connection.sql`
      UPDATE posts
      SET viewCount = viewCount + 1
      WHERE id = ${postId}
    `.execute()
  }

  /**
   * 批量更新文章狀態
   *
   * ✅ 批量操作：安全的多記錄更新
   */
  async updatePostStatus(postIds: number[], status: string, userId: number): Promise<number> {
    if (postIds.length === 0) {
      return 0
    }

    // 確保使用者只能更新自己的文章
    const result = await this.connection.sql`
      UPDATE posts
      SET status = ${status}, updatedAt = NOW()
      WHERE id IN (${postIds.join(',')})
        AND authorId = ${userId}
    `.execute()

    return result.rowCount || 0
  }

  /**
   * 取得文章及其留言（帶分頁）
   *
   * ✅ 關聯查詢：JOIN 與參數綁定的組合
   */
  async getPostWithComments(
    postId: number,
    page = 1,
    limit = 10
  ): Promise<{ post: Post; comments: any[]; total: number } | null> {
    const offset = (page - 1) * limit

    // 取得文章
    const post = await this.connection.sql<any>`
      SELECT * FROM posts WHERE id = ${postId}
    `.first()

    if (!post) {
      return null
    }

    // 取得留言（分頁）
    const comments = await this.connection.sql<any>`
      SELECT * FROM comments
      WHERE postId = ${postId}
      ORDER BY createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    `.all()

    // 取得留言總數
    const total = await this.connection.sql<{ count: number }>`
      SELECT COUNT(*) as count FROM comments WHERE postId = ${postId}
    `.first()

    return {
      post,
      comments,
      total: total?.count || 0,
    }
  }

  /**
   * 刪除舊的草稿文章
   *
   * ✅ 清理操作：安全的批量刪除（需要時間條件）
   */
  async deleteOldDrafts(beforeDate: Date, userId?: number): Promise<number> {
    let query = this.connection.sql`
      DELETE FROM posts
      WHERE status = ${'draft'} AND updatedAt < ${beforeDate}
    `

    // 如果指定了使用者，只刪除該使用者的草稿
    if (userId) {
      query = this.connection.sql`
        DELETE FROM posts
        WHERE status = ${'draft'}
          AND updatedAt < ${beforeDate}
          AND authorId = ${userId}
      `
    }

    const result = await query.execute()
    return result.rowCount || 0
  }
}
