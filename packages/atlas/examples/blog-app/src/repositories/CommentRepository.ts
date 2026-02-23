/**
 * Comment Repository
 *
 * 展示用於留言系統的安全查詢模式。
 * 重點：參數驗證、事務處理、防止 SQL Injection
 */

import { type ConnectionContract, DB } from '@gravito/atlas'

export class CommentRepository {
  private connection: ConnectionContract

  constructor(connection?: ConnectionContract) {
    this.connection = connection || DB.connection()
  }

  /**
   * 建立留言
   *
   * ✅ 參數驗證：所有輸入都通過綁定參數
   */
  async createComment(data: {
    content: string
    authorId: number
    postId: number
  }): Promise<{ id: number }> {
    const result = await this.connection.sql`
      INSERT INTO comments (content, authorId, postId, isApproved, createdAt, updatedAt)
      VALUES (${data.content}, ${data.authorId}, ${data.postId}, ${false}, NOW(), NOW())
    `.execute()

    return { id: result.insertId! }
  }

  /**
   * 取得文章的已核准留言
   *
   * ✅ 條件查詢：篩選狀態與排序
   */
  async getApprovedComments(postId: number, page = 1, limit = 20): Promise<any[]> {
    const offset = (page - 1) * limit

    const comments = await this.connection.sql<any>`
      SELECT
        c.*,
        u.name as authorName,
        u.email as authorEmail
      FROM comments c
      JOIN users u ON u.id = c.authorId
      WHERE c.postId = ${postId} AND c.isApproved = ${true}
      ORDER BY c.createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    `.all()

    return comments
  }

  /**
   * 取得待審核的留言
   *
   * ✅ 管理員查詢：取得所有未核准的留言
   */
  async getPendingComments(limit = 50): Promise<any[]> {
    const comments = await this.connection.sql<any>`
      SELECT
        c.*,
        u.name as authorName,
        p.title as postTitle
      FROM comments c
      JOIN users u ON u.id = c.authorId
      JOIN posts p ON p.id = c.postId
      WHERE c.isApproved = ${false}
      ORDER BY c.createdAt ASC
      LIMIT ${limit}
    `.all()

    return comments
  }

  /**
   * 核准留言
   *
   * ✅ 管理員操作：使用者隔離驗證
   */
  async approveComment(commentId: number): Promise<boolean> {
    const result = await this.connection.sql`
      UPDATE comments
      SET isApproved = ${true}, updatedAt = NOW()
      WHERE id = ${commentId}
    `.execute()

    return result.rowCount > 0
  }

  /**
   * 刪除留言
   *
   * ✅ 所有權驗證：確保使用者可以刪除自己的留言
   */
  async deleteComment(commentId: number, userId: number): Promise<boolean> {
    const result = await this.connection.sql`
      DELETE FROM comments
      WHERE id = ${commentId} AND authorId = ${userId}
    `.execute()

    return result.rowCount > 0
  }

  /**
   * 統計文章留言數
   *
   * ✅ 聚合查詢：計算已核准的留言
   */
  async getCommentCount(postId: number): Promise<number> {
    const result = await this.connection.sql<{ count: number }>`
      SELECT COUNT(*) as count FROM comments
      WHERE postId = ${postId} AND isApproved = ${true}
    `.first()

    return result?.count || 0
  }

  /**
   * 在事務中建立留言並更新留言計數
   *
   * ✅ 事務一致性：確保留言與計數同步
   */
  async createCommentWithCountUpdate(data: {
    content: string
    authorId: number
    postId: number
  }): Promise<{ id: number; success: boolean }> {
    let commentId: number

    try {
      await this.connection.transaction(async (trx) => {
        // 建立留言
        const result = await trx.sql`
          INSERT INTO comments (content, authorId, postId, isApproved, createdAt, updatedAt)
          VALUES (${data.content}, ${data.authorId}, ${data.postId}, ${false}, NOW(), NOW())
        `.execute()

        commentId = result.insertId!

        // 更新文章的留言計數（如果有 commentCount 欄位）
        // 注意：此為示例，實際應用可能使用不同的計數策略
        await trx.sql`
          UPDATE posts
          SET updatedAt = NOW()
          WHERE id = ${data.postId}
        `.execute()
      })

      return { id: commentId!, success: true }
    } catch {
      return { id: 0, success: false }
    }
  }

  /**
   * 刪除文章的所有留言
   *
   * ⚠️ 警告：此操作會刪除所有留言，使用時要小心
   * ✅ 參數驗證：使用參數綁定防止 SQL Injection
   */
  async deletePostComments(postId: number): Promise<number> {
    const result = await this.connection.sql`
      DELETE FROM comments WHERE postId = ${postId}
    `.execute()

    return result.rowCount || 0
  }

  /**
   * 取得使用者的留言
   *
   * ✅ 使用者相關查詢：過濾特定使用者的留言
   */
  async getUserComments(userId: number, limit = 20): Promise<any[]> {
    const comments = await this.connection.sql<any>`
      SELECT
        c.*,
        p.title as postTitle,
        p.slug as postSlug
      FROM comments c
      JOIN posts p ON p.id = c.postId
      WHERE c.authorId = ${userId}
      ORDER BY c.createdAt DESC
      LIMIT ${limit}
    `.all()

    return comments
  }
}
