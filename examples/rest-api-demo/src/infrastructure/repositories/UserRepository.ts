/**
 * User Repository Contract
 *
 * 定義用戶資料訪問的介面
 */

import type { CreateUserInput, UpdateUserInput, User } from '@domain/user/User'

export interface UserRepository {
  /**
   * 根據 ID 獲取用戶
   */
  findById(id: string): Promise<User | null>

  /**
   * 根據電子郵件獲取用戶
   */
  findByEmail(email: string): Promise<User | null>

  /**
   * 根據電話獲取用戶
   */
  findByPhone(phone: string): Promise<User | null>

  /**
   * 獲取所有用戶（分頁）
   */
  findAll(
    page: number,
    limit: number
  ): Promise<{
    data: User[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 創建新用戶
   */
  create(input: CreateUserInput): Promise<User>

  /**
   * 更新用戶
   */
  update(id: string, input: UpdateUserInput): Promise<User | null>

  /**
   * 刪除用戶
   */
  delete(id: string): Promise<boolean>

  /**
   * 檢查電子郵件是否已存在
   */
  existsByEmail(email: string): Promise<boolean>

  /**
   * 檢查電話是否已存在
   */
  existsByPhone(phone: string): Promise<boolean>

  /**
   * 獲取用戶總數
   */
  count(): Promise<number>

  /**
   * 更新最後登入時間
   */
  updateLastLoginAt(id: string): Promise<void>

  /**
   * 更新電子郵件驗證狀態
   */
  updateEmailVerified(id: string, verified: boolean): Promise<void>
}
