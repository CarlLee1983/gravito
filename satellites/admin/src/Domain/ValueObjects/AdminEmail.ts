/**
 * Admin 電子郵件地址 ValueObject
 */
export class AdminEmail {
  private constructor(readonly value: string) {}

  static create(email: string): AdminEmail {
    const trimmed = email.trim().toLowerCase()

    // 基本電子郵件驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      throw new Error(`Invalid email format: ${email}`)
    }

    if (trimmed.length > 254) {
      throw new Error('Email address is too long')
    }

    return new AdminEmail(trimmed)
  }

  static reconstitute(email: string): AdminEmail {
    return new AdminEmail(email)
  }

  equals(other: AdminEmail): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
