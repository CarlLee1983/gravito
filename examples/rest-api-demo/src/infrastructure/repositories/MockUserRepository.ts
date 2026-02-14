/**
 * Mock User Repository
 *
 * 內存中實現 UserRepository，用於開發和測試
 * 生產環境應該使用真實的資料庫實現
 */

import type { CreateUserInput, UpdateUserInput, User } from '@domain/user/User'
import type { UserRepository } from './UserRepository'

export class MockUserRepository implements UserRepository {
  private users: Map<string, User> = new Map()
  private nextId = 1

  constructor(initialUsers?: User[]) {
    if (initialUsers) {
      initialUsers.forEach((user) => {
        this.users.set(user.id, user)
      })
      const maxId = Math.max(
        ...Array.from(this.users.keys()).map((id) => {
          const match = id.match(/\d+$/)
          return match ? parseInt(match[0], 10) : 0
        })
      )
      this.nextId = maxId + 1
    }
  }

  /**
   * 根據 ID 獲取用戶
   */
  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null
  }

  /**
   * 根據電子郵件獲取用戶
   */
  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  /**
   * 根據電話獲取用戶
   */
  async findByPhone(phone: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.phone === phone) {
        return user
      }
    }
    return null
  }

  /**
   * 獲取所有用戶（分頁）
   */
  async findAll(
    page: number,
    limit: number
  ): Promise<{
    data: User[]
    total: number
    page: number
    limit: number
  }> {
    const all = Array.from(this.users.values())
    const total = all.length
    const start = (page - 1) * limit
    const data = all.slice(start, start + limit)

    return { data, total, page, limit }
  }

  /**
   * 創建新用戶
   */
  async create(input: CreateUserInput): Promise<User> {
    const id = `user_${this.nextId++}`
    const now = new Date()

    const user: User = {
      id,
      email: input.email,
      name: input.name,
      phone: input.phone,
      password: input.password,
      role: input.role || 'customer',
      status: 'active',
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    }

    this.users.set(id, user)
    return user
  }

  /**
   * 更新用戶
   */
  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const user = this.users.get(id)
    if (!user) {
      return null
    }

    const updated: User = {
      ...user,
      ...input,
      id: user.id,
      password: user.password,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    }

    this.users.set(id, updated)
    return updated
  }

  /**
   * 刪除用戶
   */
  async delete(id: string): Promise<boolean> {
    return this.users.delete(id)
  }

  /**
   * 檢查電子郵件是否已存在
   */
  async existsByEmail(email: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return true
      }
    }
    return false
  }

  /**
   * 檢查電話是否已存在
   */
  async existsByPhone(phone: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.phone === phone) {
        return true
      }
    }
    return false
  }

  /**
   * 獲取用戶總數
   */
  async count(): Promise<number> {
    return this.users.size
  }

  /**
   * 更新最後登入時間
   */
  async updateLastLoginAt(id: string): Promise<void> {
    const user = this.users.get(id)
    if (user) {
      const updated: User = {
        ...user,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      }
      this.users.set(id, updated)
    }
  }

  /**
   * 更新電子郵件驗證狀態
   */
  async updateEmailVerified(id: string, verified: boolean): Promise<void> {
    const user = this.users.get(id)
    if (user) {
      const updated: User = {
        ...user,
        emailVerified: verified,
        updatedAt: new Date(),
      }
      this.users.set(id, updated)
    }
  }

  /**
   * 初始化測試用戶
   */
  seedTestUsers(): void {
    const testUsers: (CreateUserInput & { password: string })[] = [
      {
        email: 'admin@example.com',
        name: 'Administrator',
        phone: '+886912345678',
        password: '$2b$10$s4MKlFDSxvzK0KNqZxqXu.pE0YV4lVqH2rqHX8n2cWEE5V2pKkbCK', // hashed: Admin@123!
        role: 'admin',
      },
      {
        email: 'john@example.com',
        name: 'John Doe',
        phone: '+886912345679',
        password: '$2b$10$qzYXgVgmSZLQmLvDNKR3n.lCR5e8aPZW9zR8mPdMWUx3GF8nH2mLO', // hashed: User@1234!
        role: 'customer',
      },
      {
        email: 'jane@example.com',
        name: 'Jane Smith',
        phone: '+886912345680',
        password: '$2b$10$qzYXgVgmSZLQmLvDNKR3n.lCR5e8aPZW9zR8mPdMWUx3GF8nH2mLO', // hashed: User@1234!
        role: 'customer',
      },
      {
        email: 'bob@example.com',
        name: 'Bob Johnson',
        phone: '+886912345681',
        password: '$2b$10$qzYXgVgmSZLQmLvDNKR3n.lCR5e8aPZW9zR8mPdMWUx3GF8nH2mLO', // hashed: User@1234!
        role: 'customer',
      },
      {
        email: 'alice@example.com',
        name: 'Alice Williams',
        phone: '+886912345682',
        password: '$2b$10$qzYXgVgmSZLQmLvDNKR3n.lCR5e8aPZW9zR8mPdMWUx3GF8nH2mLO', // hashed: User@1234!
        role: 'customer',
      },
    ]

    testUsers.forEach((input) => {
      const id = `user_${this.nextId++}`
      const now = new Date()

      const user: User = {
        id,
        email: input.email,
        name: input.name,
        phone: input.phone,
        password: input.password,
        role: input.role || 'customer',
        status: 'active',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      }

      this.users.set(id, user)
    })
  }
}
