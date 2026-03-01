/**
 * 權限鍵 ValueObject
 * 格式: "group:action" 或 "group:action:field"
 * 例如: "products:create", "products:update:price"
 */
export class PermissionKey {
  readonly group: string
  readonly action: string
  readonly field?: string

  private constructor(
    public readonly value: string,
    group: string,
    action: string,
    field?: string
  ) {
    this.group = group
    this.action = action
    this.field = field
  }

  static create(key: string): PermissionKey {
    const trimmed = key.trim()

    // 驗證格式
    const parts = trimmed.split(':')
    if (parts.length < 2 || parts.length > 3) {
      throw new Error(
        `Invalid permission key format: ${key}. Expected: group:action or group:action:field`
      )
    }

    const [group, action, field] = parts

    if (!group || !action) {
      throw new Error(`Invalid permission key format: ${key}. group and action cannot be empty`)
    }

    // 驗證只包含小寫字母、數字和下劃線
    const validFormat = /^[a-z0-9_]+$/
    if (!validFormat.test(group) || !validFormat.test(action)) {
      throw new Error(
        `Invalid permission key format: ${key}. Only lowercase letters, numbers, and underscores allowed`
      )
    }

    if (field && !validFormat.test(field)) {
      throw new Error(
        `Invalid permission key format: ${key}. Field can only contain lowercase letters, numbers, and underscores`
      )
    }

    return new PermissionKey(trimmed, group, action, field)
  }

  static reconstitute(key: string): PermissionKey {
    const parts = key.split(':')
    const [group, action, field] = parts
    return new PermissionKey(key, group, action, field)
  }

  /**
   * 檢查此權限是否符合給定的模式
   * 支援萬用字元: "group:*" 符合同一 group 下的所有 action
   */
  matchesPattern(pattern: string): boolean {
    if (pattern === '*') {
      return true
    }

    const patternParts = pattern.split(':')
    const keyParts = this.value.split(':')

    // group 必須相符
    if (patternParts[0] !== '*' && patternParts[0] !== keyParts[0]) {
      return false
    }

    // action 必須相符或是萬用字元
    if (patternParts.length > 1) {
      if (patternParts[1] !== '*' && patternParts[1] !== keyParts[1]) {
        return false
      }
    }

    // field 必須相符或是萬用字元
    if (patternParts.length > 2) {
      if (patternParts[2] !== '*' && patternParts[2] !== keyParts[2]) {
        return false
      }
    }

    return true
  }

  equals(other: PermissionKey): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
