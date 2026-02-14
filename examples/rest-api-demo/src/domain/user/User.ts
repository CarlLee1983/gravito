/**
 * User Domain Model
 *
 * 代表系統中的用戶，包含用戶基本信息、認證信息、角色等
 */

export type UserRole = 'admin' | 'customer' | 'guest'

export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  password: string // Bcrypt 雜湊值
  role: UserRole
  status: UserStatus
  emailVerified: boolean
  verificationToken?: string
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserInput {
  email: string
  name: string
  phone?: string
  password: string // 明文密碼，會在應用層進行雜湊
  role?: UserRole
}

export interface UpdateUserInput {
  name?: string
  phone?: string
  email?: string
  status?: UserStatus
  role?: UserRole
}

export interface UserProfile extends Omit<User, 'password'> {
  orderCount: number
  totalSpent: number
}

/**
 * User 領域服務
 */
export class UserDomainService {
  /**
   * 驗證電子郵件格式
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * 驗證密碼強度
   * 要求：至少 8 個字元，包含大寫字母、小寫字母、數字和特殊字符
   */
  static isStrongPassword(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    const isLongEnough = password.length >= 8

    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough
  }

  /**
   * 驗證電話號碼格式（簡單驗證）
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/
    return phoneRegex.test(phone)
  }

  /**
   * 檢查用戶是否為管理員
   */
  static isAdmin(user: User): boolean {
    return user.role === 'admin'
  }

  /**
   * 檢查用戶是否為活躍狀態
   */
  static isActive(user: User): boolean {
    return user.status === 'active'
  }
}
