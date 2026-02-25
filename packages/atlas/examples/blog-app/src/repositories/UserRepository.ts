/**
 * User Repository
 *
 * 展示如何使用 SafeQueryBuilder 進行安全的資料庫操作。
 * 此 Repository 實演了常見的查詢模式與最佳實踐。
 */

import { type ConnectionContract, DB } from '@gravito/atlas'
import type { User } from '../models/User'

export interface UserSearchFilters {
  query?: string // 搜尋名稱或郵箱
  isActive?: boolean
  page?: number
  limit?: number
}

export class UserRepository {
  private connection: ConnectionContract

  constructor(connection?: ConnectionContract) {
    this.connection = connection || DB.connection()
  }

  /**
   * 搜尋使用者 - 展示參數綁定與搜尋模式
   *
   * ✅ 安全模式：使用 db.sql 與參數綁定
   * - 搜尋字串（$searchTerm）自動轉義，無 SQL Injection 風險
   * - 資料庫負責 LIKE 萬用字元匹配
   */
  async searchUsers(filters: UserSearchFilters): Promise<User[]> {
    let query = this.connection.table('users').select('*')

    // 搜尋條件
    if (filters.query) {
      const searchTerm = `%${filters.query}%`
      query = query.where((q) => {
        q.where('name', 'like', searchTerm).orWhere('email', 'like', searchTerm)
      })
    }

    // 狀態篩選
    if (filters.isActive !== undefined) {
      query = query.where('isActive', filters.isActive)
    }

    // 排序與分頁
    const limit = filters.limit || 20
    const page = filters.page || 1
    const offset = (page - 1) * limit

    const users = await query.orderBy('createdAt', 'desc').limit(limit).offset(offset).get()

    return users
  }

  /**
   * 使用 SafeQueryBuilder 搜尋使用者 - 標籤範本版本
   *
   * ✅ 最佳實踐：使用 db.sql 標籤範本
   * - 更清晰的 SQL 表達
   * - 自動參數綁定
   * - 更容易檢查 SQL 注入風險
   */
  async searchUsersWithSQL(filters: UserSearchFilters): Promise<User[]> {
    const searchTerm = filters.query ? `%${filters.query}%` : null
    const isActive = filters.isActive ?? null
    const limit = filters.limit || 20
    const page = filters.page || 1
    const offset = (page - 1) * limit

    // 使用 db.sql 進行安全查詢
    // 所有 ${...} 參數自動綁定，無 SQL Injection 風險
    let users: User[]

    if (searchTerm && isActive !== null) {
      users = await this.connection.sql<any>`
        SELECT * FROM users
        WHERE (name LIKE ${searchTerm} OR email LIKE ${searchTerm})
          AND isActive = ${isActive}
        ORDER BY createdAt DESC
        LIMIT ${limit} OFFSET ${offset}
      `.all()
    } else if (searchTerm) {
      users = await this.connection.sql<any>`
        SELECT * FROM users
        WHERE name LIKE ${searchTerm} OR email LIKE ${searchTerm}
        ORDER BY createdAt DESC
        LIMIT ${limit} OFFSET ${offset}
      `.all()
    } else if (isActive !== null) {
      users = await this.connection.sql<any>`
        SELECT * FROM users
        WHERE isActive = ${isActive}
        ORDER BY createdAt DESC
        LIMIT ${limit} OFFSET ${offset}
      `.all()
    } else {
      users = await this.connection.sql<any>`
        SELECT * FROM users
        ORDER BY createdAt DESC
        LIMIT ${limit} OFFSET ${offset}
      `.all()
    }

    return users
  }

  /**
   * 依郵箱查找使用者
   *
   * ✅ 簡單且安全：參數綁定防止 SQL Injection
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await this.connection.sql<any>`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `.first()

    return user || null
  }

  /**
   * 統計活躍使用者數量
   *
   * ✅ 聚合查詢：使用 COUNT(*) 與參數綁定
   */
  async countActiveUsers(): Promise<number> {
    const result = await this.connection.sql<{ count: number }>`
      SELECT COUNT(*) as count FROM users WHERE isActive = ${true}
    `.first()

    return result?.count || 0
  }

  /**
   * 取得使用者及其文章（帶過濾）
   *
   * ✅ 進階用法：JOIN、WHERE、ORDER BY 的完整組合
   */
  async getUsersWithPostCount(minPostCount = 0): Promise<Array<User & { postCount: number }>> {
    const results = await this.connection.sql<any>`
      SELECT
        u.*,
        COUNT(p.id) as postCount
      FROM users u
      LEFT JOIN posts p ON p.authorId = u.id
      GROUP BY u.id
      HAVING COUNT(p.id) >= ${minPostCount}
      ORDER BY postCount DESC
    `.all()

    return results
  }

  /**
   * 批量停用使用者
   *
   * ✅ 批量操作：參數陣列在 IN 子句中使用
   * 注意：直接的 IN 子句需要小心處理，SafeQueryBuilder 會正確綁定參數
   */
  async deactivateUsers(userIds: number[]): Promise<number> {
    if (userIds.length === 0) {
      return 0
    }

    // 使用 IN 子句進行批量操作
    const result = await this.connection.sql<{ count: number }>`
      UPDATE users
      SET isActive = ${false}, updatedAt = NOW()
      WHERE id IN (${userIds.join(',')})
    `.execute()

    return result.rowCount || 0
  }

  /**
   * 取得使用者統計
   *
   * ✅ 複雜聚合：多個 GROUP BY 與 HAVING 條款
   */
  async getUserStatistics(): Promise<
    Array<{
      status: string
      userCount: number
      totalPosts: number
      avgPostsPerUser: number
    }>
  > {
    const stats = await this.connection.sql<any>`
      SELECT
        CASE
          WHEN isActive = true THEN 'active'
          ELSE 'inactive'
        END as status,
        COUNT(DISTINCT u.id) as userCount,
        COUNT(DISTINCT p.id) as totalPosts,
        AVG(CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) as avgPostsPerUser
      FROM users u
      LEFT JOIN posts p ON p.authorId = u.id
      GROUP BY isActive
    `.all()

    return stats
  }

  /**
   * 在事務中建立使用者與初始文章
   *
   * ✅ 事務處理：確保資料一致性
   */
  async createUserWithFirstPost(
    userData: { name: string; email: string; password: string },
    postData: { title: string; content: string }
  ): Promise<{ userId: number; postId: number }> {
    let userId: number
    let postId: number

    await this.connection.transaction(async (trx) => {
      // 建立使用者
      const userResult = await trx.sql`
        INSERT INTO users (name, email, password, isActive, createdAt, updatedAt)
        VALUES (${userData.name}, ${userData.email}, ${userData.password}, ${true}, NOW(), NOW())
      `.execute()

      userId = userResult.insertId!

      // 建立初始文章
      const postResult = await trx.sql`
        INSERT INTO posts (
          title, slug, content, authorId, status, createdAt, updatedAt
        ) VALUES (
          ${postData.title},
          ${postData.title.toLowerCase().replace(/\s+/g, '-')},
          ${postData.content},
          ${userId},
          ${'draft'},
          NOW(),
          NOW()
        )
      `.execute()

      postId = postResult.insertId!
    })

    return { userId: userId!, postId: postId! }
  }
}
